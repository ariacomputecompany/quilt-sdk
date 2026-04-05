import protobuf from "protobufjs";
import { QuiltClient } from "quilt-sdk";
import WebSocket from "ws";

const BASE_URL = process.env.QUILT_BASE_URL ?? "https://backend.quilt.sh";
const API_KEY = process.env.QUILT_API_KEY;
const JWT = process.env.QUILT_JWT;

type EnvelopePayload = {
  exec_command?: {
    argv: string[];
    timeout_ms: number;
    workdir: string;
    env: Record<string, string>;
    desired_state_version: number;
  };
};

type TerminalSession = {
  session_id: string;
  attach_url: string;
};

async function main(): Promise<void> {
  const cleanup = new CleanupStack();
  const client = createClient({
    webSocket: WebSocket as unknown as typeof globalThis.WebSocket,
  });
  const lines: string[] = [];

  const { containerId, operationId } = await createPublicContainer(client, "interactive-example");
  cleanup.defer(async () => deletePublicContainer(client, containerId));
  lines.push(`container created operation=${operationId} id=${containerId}`);

  const root = await protobuf.load("/home/ubuntu/quilt-prod/proto/jets.proto");
  const Envelope = root.lookupType("jets.Envelope");
  const PermissionLevel = root.lookupEnum("jets.PermissionLevel");
  const ApplyMode = root.lookupEnum("jets.ApplyMode");

  const encodeEnvelope = (msgId: string, payload: EnvelopePayload): string => {
    const message = Envelope.create({
      version: 1,
      msgId,
      requestId: `${msgId}-request`,
      traceId: `${msgId}-trace`,
      correlationId: `${msgId}-corr`,
      causationId: `${msgId}-cause`,
      from: "quilt-demo",
      to: containerId,
      streamKey: containerId,
      seq: 0,
      sentAt: Math.floor(Date.now()),
      ttlMs: 60_000,
      permissionLevel: PermissionLevel.values.EXECUTE,
      idempotencyKey: `${msgId}-idempotent`,
      payload: {
        execCommand: {
          argv: payload.exec_command?.argv ?? ["echo", "icc-ok"],
          timeoutMs: payload.exec_command?.timeout_ms ?? 5_000,
          workdir: payload.exec_command?.workdir ?? "/",
          env: payload.exec_command?.env ?? {},
          desiredStateVersion: payload.exec_command?.desired_state_version ?? 0,
          applyMode: ApplyMode.values.ENFORCE,
        },
      },
    });
    return Buffer.from(Envelope.encode(message).finish()).toString("base64");
  };

  const msgId = suffix("icc-msg");
  const published = (await client.platform.iccPublish(
    encodeEnvelope(msgId, {
      exec_command: {
        argv: ["echo", "icc-msg-ok"],
        timeout_ms: 5_000,
        workdir: "/",
        env: {},
        desired_state_version: 0,
      },
    }),
  )) as Record<string, unknown>;
  assert(Number(published.stream_seq ?? 0) >= 1, "icc publish stream_seq missing");

  const inbox = (await client.platform.iccMessages({
    container_identifier: containerId,
    limit: 10,
  })) as { messages: Array<Record<string, unknown>> };
  const inboxMessage = inbox.messages.find(
    (message) =>
      String((message.envelope_summary as Record<string, unknown> | undefined)?.msg_id ?? "") ===
      msgId,
  );
  assert(inboxMessage, "icc inbox missing published message");

  const acked = (await client.platform.iccAck({
    msg_id: msgId,
    action: "ack",
    reason: "terminal-example",
  })) as Record<string, unknown>;
  assert(String(acked.new_state) === "acked", "icc ack did not transition to acked");

  const replay = (await client.platform.iccContainerReplay(containerId, {
    state: "acked",
    limit: 10,
  })) as Record<string, unknown>;
  assert(Number(replay.replayed ?? 0) >= 1, "icc replay returned no messages");

  const execBroadcast = (await client.platform.iccExecBroadcast({
    command: ["echo", "icc-broadcast-ok"],
    timeout_ms: 10_000,
    targets: { container_ids: [containerId] },
  })) as Record<string, unknown>;
  assert(Number(execBroadcast.succeeded ?? 0) === 1, "icc exec broadcast did not succeed");
  lines.push(`icc publish/read/ack/replay/exec-broadcast ok msg_id=${msgId}`);

  const terminalSession = (await client.terminal.createSession({
    target: "container",
    container_identifier: containerId,
    shell: "/bin/sh",
    cols: 100,
    rows: 30,
  })) as unknown as TerminalSession;
  const sessionId = terminalSession.session_id;
  assert(sessionId, "terminal session_id missing");
  cleanup.defer(async () => {
    await client.terminal.deleteSession(sessionId);
  });

  const listedSessions = (await client.terminal.listSessions({
    target: "container",
  })) as unknown as { sessions: Array<Record<string, unknown>> };
  const fetchedSession = (await client.terminal.getSession(sessionId)) as unknown as Record<
    string,
    unknown
  >;
  assert(
    listedSessions.sessions.some((session) => String(session.session_id) === sessionId),
    "terminal list missing session",
  );
  assert(String(fetchedSession.session_id) === sessionId, "terminal get mismatch");

  const resized = (await client.terminal.resizeSession(sessionId, {
    cols: 120,
    rows: 40,
  })) as unknown as Record<string, unknown>;
  assert(resized.success === true, "terminal resize failed");

  const wsResult = await verifyTerminalWebSocket(client, sessionId);
  lines.push(`terminal rest/ws ok session=${sessionId} output=${wsResult}`);

  const deletedSession = (await client.terminal.deleteSession(sessionId)) as unknown as Record<
    string,
    unknown
  >;
  assert(deletedSession.success === true, "terminal delete failed");

  console.log("Terminal and ICC example summary");
  for (const line of lines) {
    console.log(`- ${line}`);
  }
}

function createClient(options: Partial<QuiltClient.Options> = {}): QuiltClient {
  return QuiltClient.connect({
    baseUrl: BASE_URL,
    ...(API_KEY ? { apiKey: API_KEY } : JWT ? { token: JWT } : {}),
    ...options,
  });
}

class CleanupStack {
  private readonly tasks: Array<() => Promise<void>> = [];

  defer(task: () => Promise<void>): void {
    this.tasks.push(task);
  }

  async run(): Promise<void> {
    while (this.tasks.length > 0) {
      const task = this.tasks.pop();
      if (!task) {
        continue;
      }
      try {
        await task();
      } catch (error) {
        console.warn("[cleanup] task failed:", error);
      }
    }
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function suffix(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
}

async function createPublicContainer(
  client: QuiltClient,
  namePrefix: string,
): Promise<{ containerId: string; operationId: string }> {
  const name = suffix(namePrefix);
  const accepted = await client.containers.create({
    name,
    image: "prod",
    command: ["tail", "-f", "/dev/null"],
    memory_limit_mb: 256,
    cpu_limit_percent: 25,
  });
  const operation = await client.awaitOperation(accepted.operation_id, {
    timeoutMs: 120_000,
  });
  if (String(operation.status) !== "succeeded") {
    throw new Error(`container create operation failed: ${JSON.stringify(operation)}`);
  }
  const result = (operation.result as Record<string, unknown> | undefined) ?? {};
  const containerId =
    typeof result.container_id === "string"
      ? result.container_id
      : String((await client.containers.byName(name)).container_id ?? "");
  assert(containerId, `container create for ${name} did not yield a container_id`);
  return { containerId, operationId: accepted.operation_id };
}

async function deletePublicContainer(client: QuiltClient, containerId: string): Promise<void> {
  try {
    const accepted = await client.containers.remove(containerId);
    if (accepted.operation_id) {
      await client.awaitOperation(accepted.operation_id, {
        timeoutMs: 120_000,
      });
    }
  } catch (error) {
    if (typeof error === "object" && error !== null && "status" in error && error.status === 404) {
      return;
    }
    throw error;
  }
}

async function verifyTerminalWebSocket(client: QuiltClient, sessionId: string): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    let resolved = false;
    let sawReady = false;
    let sawPong = false;
    let sawOutput = "";

    const ws = client.terminalRealtime.connect({ session_id: sessionId }, [
      "terminal",
    ]) as unknown as WebSocket;
    const timeout = setTimeout(() => {
      if (resolved) {
        return;
      }
      resolved = true;
      ws.terminate();
      reject(new Error(`terminal websocket timeout for session ${sessionId}`));
    }, 15_000);

    const finish = (value: string) => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearTimeout(timeout);
      ws.close();
      resolve(value);
    };

    ws.on("open", () => {
      client.terminalRealtime.sendControlMessage(ws as unknown as WebSocket, {
        type: "ping",
        ts: Date.now(),
      });
      ws.send(Buffer.from("echo ws-terminal-ok\n", "utf8"));
    });

    ws.on("message", (data: WebSocket.RawData, isBinary: boolean) => {
      if (isBinary) {
        sawOutput += rawDataToBuffer(data).toString("utf8");
        if (sawReady && sawPong && sawOutput.includes("ws-terminal-ok")) {
          finish("ws-terminal-ok");
        }
        return;
      }

      const message = client.terminalRealtime.parseServerMessage(data.toString());
      if (message?.type === "ready") {
        sawReady = true;
      } else if (message?.type === "pong") {
        sawPong = true;
      } else if (message?.type === "error") {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          ws.close();
          reject(new Error(`terminal websocket error: ${JSON.stringify(message)}`));
        }
        return;
      }

      if (sawReady && sawPong && sawOutput.includes("ws-terminal-ok")) {
        finish("ws-terminal-ok");
      }
    });

    ws.on("error", (error: Error) => {
      if (resolved) {
        return;
      }
      resolved = true;
      clearTimeout(timeout);
      reject(error);
    });

    ws.on("close", () => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(new Error(`terminal websocket closed before verification for session ${sessionId}`));
      }
    });
  });
}

function rawDataToBuffer(data: WebSocket.RawData): Buffer {
  if (Buffer.isBuffer(data)) {
    return data;
  }
  if (data instanceof ArrayBuffer) {
    return Buffer.from(data);
  }
  return Buffer.concat(data);
}

main().catch((error) => {
  console.error("Terminal and ICC example failed");
  console.error(error);
  process.exitCode = 1;
});
