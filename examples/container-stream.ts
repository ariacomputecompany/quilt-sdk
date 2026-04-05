import { QuiltClient } from "quilt-sdk";

const BASE_URL = process.env.QUILT_BASE_URL ?? "https://backend.quilt.sh";
const API_KEY = process.env.QUILT_API_KEY;
const JWT = process.env.QUILT_JWT;

async function main(): Promise<void> {
  const client = QuiltClient.connect({
    baseUrl: BASE_URL,
    ...(API_KEY ? { apiKey: API_KEY } : JWT ? { token: JWT } : {}),
  });

  const name = `stream-example-${Date.now()}`;
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
    throw new Error(`container create failed: ${JSON.stringify(operation)}`);
  }

  const containerId =
    typeof operation.result === "object" && operation.result !== null
      ? String((operation.result as { container_id?: string }).container_id ?? "")
      : "";
  if (!containerId) {
    throw new Error(`missing container_id in operation result: ${JSON.stringify(operation)}`);
  }

  try {
    const frames = await client.containerStreams.open(containerId, {
      command: ["/bin/sh", "-lc", "echo stream-out; echo stream-err 1>&2"],
      timeout_ms: 30_000,
    });

    const stdout: string[] = [];
    const stderr: string[] = [];
    let exitCode: number | null = null;

    for await (const frame of frames) {
      switch (frame.type) {
        case "stdout":
          stdout.push(Buffer.from(frame.data_b64, "base64").toString("utf8"));
          break;
        case "stderr":
          stderr.push(Buffer.from(frame.data_b64, "base64").toString("utf8"));
          break;
        case "error":
          throw new Error(`stream failed: ${frame.message}`);
        case "exit":
          exitCode = frame.code;
          break;
        default:
          break;
      }
    }

    console.log("Container stream example summary");
    console.log(`- container_id=${containerId}`);
    console.log(`- stdout=${JSON.stringify(stdout.join(""))}`);
    console.log(`- stderr=${JSON.stringify(stderr.join(""))}`);
    console.log(`- exit_code=${exitCode}`);
  } finally {
    const removeAccepted = await client.containers.remove(containerId, "async");
    await client.awaitOperation(removeAccepted.operation_id, {
      timeoutMs: 60_000,
    });
  }
}

await main();
