import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { EventSource } from "eventsource";
import { QuiltClient } from "quilt-sdk";

const BASE_URL = process.env.QUILT_BASE_URL ?? "https://backend.quilt.sh";
const API_KEY = process.env.QUILT_API_KEY;
const JWT = process.env.QUILT_JWT;

type CheckResult = {
  chunk: string;
  ok: boolean;
  notes: string[];
};

async function main(): Promise<void> {
  const cleanup = new CleanupStack();
  const client = createClient({
    eventSource: EventSource as typeof globalThis.EventSource,
  });
  const results: CheckResult[] = [];
  const notes: string[] = [];

  const push = (chunk: string, ok: boolean, lines: string[]) => {
    results.push({ chunk, ok, notes: lines });
  };

  try {
    const health = await client.system.health();
    const info = (await client.system.info()) as Record<string, unknown>;
    assert(health.status === "ok", "health endpoint did not report ok");
    assert(typeof info === "object" && info !== null, "system info payload missing");
    push("health", true, [`base_url=${BASE_URL}`, `health=${health.status}`]);

    const firstEvent = await readFirstSseEvent(client);
    assert(firstEvent.includes("event: ready"), "event stream did not start with ready");
    push("events", true, ["initial event=ready"]);

    const {
      containerId,
      name: containerName,
      operationId,
    } = await createPublicContainer(client, "http-verify");
    cleanup.defer(async () => deletePublicContainer(client, containerId));
    push("container bootstrap", true, [
      `container_id=${containerId}`,
      `name=${containerName}`,
      `create_operation=${operationId}`,
    ]);

    const list = (await client.containers.list()) as {
      containers: Array<Record<string, unknown>>;
    };
    const container = (await client.containers.get(containerId)) as Record<string, unknown>;
    const byName = (await client.containers.byName(containerName)) as Record<string, unknown>;
    const ready = await client.platform.checkContainerReady(containerId);
    assert(Array.isArray(list.containers), "container list missing");
    assert(String(container.container_id) === containerId, "container lookup mismatch");
    assert(String(byName.container_id) === containerId, "container by-name mismatch");
    assert(ready.ready === true, "container was not ready");
    push("containers", true, [`listed=${list.containers.length}`, `ready=${ready.ready}`]);

    await client.platform.patchContainerEnv(containerId, {
      HTTP_VERIFY: "patched",
      KEEP_ME: "1",
    });
    const envAfterPatch = await client.platform.getContainerEnv(containerId);
    assert(envAfterPatch.environment.HTTP_VERIFY === "patched", "env patch missing key");
    await client.platform.replaceContainerEnv(containerId, {
      HTTP_VERIFY: "replaced",
    });
    const envAfterReplace = await client.platform.getContainerEnv(containerId);
    assert(envAfterReplace.environment.HTTP_VERIFY === "replaced", "env replace missing key");
    assert(!("KEEP_ME" in envAfterReplace.environment), "env replace did not replace");
    push("env", true, [`keys=${Object.keys(envAfterReplace.environment).join(",")}`]);

    const execAccepted = (await client.containers.exec(containerId, {
      command: ["sh", "-lc", "echo http-verify-ok"],
      workdir: "/",
      timeout_ms: 10_000,
    })) as { job_id: string };
    const execJob = await waitForJob(client, containerId, execAccepted.job_id);
    assert(String(execJob.status) === "completed", "exec job did not complete");
    assert(String(execJob.stdout ?? "").includes("http-verify-ok"), "exec stdout mismatch");
    const jobs = await client.platform.listContainerJobs(containerId);
    const processes = (await client.raw("get", `/api/containers/${containerId}/processes`)) as {
      processes: Array<Record<string, unknown>>;
    };
    assert(Array.isArray(jobs.jobs) && jobs.jobs.length > 0, "job list empty");
    assert(
      Array.isArray(processes.processes) && processes.processes.length > 0,
      "process list empty",
    );
    push("exec/jobs", true, [
      `job_id=${execAccepted.job_id}`,
      `stdout=${String(execJob.stdout ?? "").trim()}`,
      `processes=${processes.processes.length}`,
    ]);

    const snapshot = (await client.containers.snapshot(containerId, {})) as Record<string, unknown>;
    const snapshotId = String(snapshot.snapshot_id ?? "");
    assert(snapshotId, "snapshot_id missing");
    cleanup.defer(async () => {
      try {
        await client.raw("delete", `/api/snapshots/${snapshotId}`);
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "status" in error &&
          error.status === 404
        ) {
          return;
        }
        throw error;
      }
    });
    const snapshotGet = (await client.raw("get", `/api/snapshots/${snapshotId}`)) as Record<
      string,
      unknown
    >;
    const lineage = (await client.raw("get", `/api/snapshots/${snapshotId}/lineage`)) as Record<
      string,
      unknown
    >;
    const cloneAccepted = await client.platform.cloneSnapshot(snapshotId, {
      name: suffix("http-clone"),
    });
    const cloneOp = await waitForOperation(client, String(cloneAccepted.operation_id));
    const cloneContainerId = String(
      (cloneOp.result as Record<string, unknown> | undefined)?.container_id ??
        (cloneOp as Record<string, unknown>).container_id ??
        "",
    );
    if (cloneContainerId) {
      cleanup.defer(async () => deletePublicContainer(client, cloneContainerId));
    }
    const forkAccepted = await client.platform.forkContainer(containerId, {
      name: suffix("http-fork"),
    });
    const forkOp = await waitForOperation(client, String(forkAccepted.operation_id));
    const forkContainerId = String(
      (forkOp.result as Record<string, unknown> | undefined)?.container_id ??
        (forkOp as Record<string, unknown>).container_id ??
        "",
    );
    if (forkContainerId) {
      cleanup.defer(async () => deletePublicContainer(client, forkContainerId));
    }
    push("snapshots", true, [
      `snapshot_id=${snapshotId}`,
      `lineage_keys=${Object.keys(lineage).length}`,
      `clone_status=${String(cloneOp.status)}`,
      `fork_status=${String(forkOp.status)}`,
      `snapshot_name=${String(snapshotGet.name ?? "")}`,
    ]);

    const volumeName = suffix("http-vol");
    cleanup.defer(async () => {
      const remove = (await client.volumes.delete(volumeName, "async")) as {
        operation_id?: string;
      };
      if (remove.operation_id) {
        await waitForOperation(client, String(remove.operation_id));
      }
    });
    const volume = await client.volumes.create({
      name: volumeName,
      driver: "local",
      labels: { suite: "http" },
    });
    const inspect = await client.volumes.inspect(volumeName);
    assert(String((volume as { name: string }).name) === volumeName, "volume create mismatch");
    await client.platform.putVolumeFile(volumeName, {
      path: "/hello.txt",
      content: Buffer.from("hello-volume", "utf8").toString("base64"),
      mode: 0o644,
    });
    const file = await client.platform.getVolumeFile(volumeName, "hello.txt");
    assert(
      Buffer.from(file.content, "base64").toString("utf8") === "hello-volume",
      "volume file mismatch",
    );
    const ls = (await client.volumes.listFiles(volumeName)) as {
      files: Array<Record<string, unknown>>;
    };
    const archiveContent = await createTarGzBase64([
      { path: "nested/archive.txt", content: "from-archive" },
    ]);
    const volumeArchiveAccepted = (await client.platform.uploadVolumeArchive(volumeName, {
      content: archiveContent,
      strip_components: 0,
      path: "/",
    })) as { operation_id?: string };
    const volumeArchiveOp = await waitForOperation(
      client,
      String(volumeArchiveAccepted.operation_id),
    );
    const archived = await client.platform.getVolumeFile(volumeName, "nested/archive.txt");
    assert(
      Buffer.from(archived.content, "base64").toString("utf8") === "from-archive",
      "archive upload mismatch",
    );
    await client.platform.deleteVolumeFile(volumeName, "hello.txt");
    push("volumes", true, [
      `volume=${String((volume as { name: string }).name)}`,
      `listed_files=${Array.isArray(ls.files) ? ls.files.length : 0}`,
      `inspect_keys=${Object.keys(inspect).length}`,
      `archive_status=${String(volumeArchiveOp.status)}`,
    ]);

    const containerArchiveAccepted = (await client.platform.uploadContainerArchive(containerId, {
      content: await createTarGzBase64([{ path: "uploaded.txt", content: "into-container" }]),
      strip_components: 0,
      path: "/tmp",
    })) as { operation_id?: string };
    const containerArchiveOp = await waitForOperation(
      client,
      String(containerArchiveAccepted.operation_id),
    );
    const archivedExec = (await client.containers.exec(containerId, {
      command: ["cat", "/tmp/uploaded.txt"],
      timeout_ms: 10_000,
    })) as { job_id: string };
    const archivedJob = await waitForJob(client, containerId, archivedExec.job_id);
    assert(
      String(archivedJob.stdout ?? "").trim() === "into-container",
      "container archive content mismatch",
    );
    push("container archive", true, [`archive_status=${String(containerArchiveOp.status)}`]);

    const allocations = (await client.platform.listNetworkAllocations()) as Record<string, unknown>;
    const network = (await client.containers.networkGet(containerId)) as Record<string, unknown>;
    const diagnostics = (await client.containers.networkDiagnostics(containerId)) as Record<
      string,
      unknown
    >;
    const egress = (await client.containers.egress(containerId)) as Record<string, unknown>;
    const activity = (await client.system.activity({ limit: 5 })) as Record<string, unknown>;
    const monitorProcesses = (await client.platform.listMonitorProcesses()) as Record<
      string,
      unknown
    >;
    const monitorProfile = (await client.platform.monitorProfile()) as Record<string, unknown>;
    const dnsEntries = (await client.raw("get", "/api/dns/entries")) as Record<string, unknown>;
    const cleanupTasks = (await client.raw("get", "/api/cleanup/tasks")) as Record<string, unknown>;
    const containerCleanup = (await client.containers.cleanupTasks(containerId)) as Record<
      string,
      unknown
    >;
    notes.push(`network allocations keys=${Object.keys(allocations).length}`);
    push("network+ops", true, [
      `network_keys=${Object.keys(network).length}`,
      `diagnostics_keys=${Object.keys(diagnostics).length}`,
      `egress_keys=${Object.keys(egress).length}`,
      `activity_keys=${Object.keys(activity).length}`,
      `monitor_process_keys=${Object.keys(monitorProcesses).length}`,
      `profile_keys=${Object.keys(monitorProfile).length}`,
      `dns_keys=${Object.keys(dnsEntries).length}`,
      `cleanup_keys=${Object.keys(cleanupTasks).length}`,
      `container_cleanup_keys=${Object.keys(containerCleanup).length}`,
    ]);

    const gui = await client.containers.guiUrl(containerId);
    const iccRoot = await client.platform.iccRoot();
    const iccHealth = await client.platform.iccHealth();
    const iccStreams = await client.platform.iccStreams();
    const iccSchema = await client.platform.iccSchema();
    const iccTypes = await client.platform.iccTypes();
    const iccProto = await client.platform.iccProto();
    const iccDescriptor = await client.platform.iccDescriptor();
    const iccContainer = await client.platform.iccContainerStatus(containerId);
    const iccState = (await client.platform.iccStateVersion(containerId)) as Record<
      string,
      unknown
    >;
    push("gui+icc", true, [
      "gui_status=200",
      `icc_root_keys=${Object.keys(iccRoot).length}`,
      `icc_health_keys=${Object.keys(iccHealth).length}`,
      `icc_streams_keys=${Object.keys(iccStreams).length}`,
      `icc_schema_keys=${Object.keys(iccSchema).length}`,
      `icc_types_keys=${Object.keys(iccTypes).length}`,
      `icc_proto_len=${iccProto.length}`,
      `icc_descriptor_keys=${Object.keys(iccDescriptor).length}`,
      `icc_container_status=${Object.keys(iccContainer).length > 0 ? 200 : 0}`,
      `icc_state_status=${Object.keys(iccState).length > 0 ? 200 : 0}`,
    ]);
    assert(typeof gui.gui_url === "string", "gui url missing");

    const functionName = suffix("http-fn");
    const createdFn = (await client.functions.create({
      name: functionName,
      handler: "echo http-function-ok",
      runtime: "shell",
      memory_limit_mb: 256,
      cpu_limit_percent: 25,
      timeout_seconds: 15,
      min_instances: 0,
      max_instances: 1,
      cleanup_on_exit: true,
    })) as { function_id: string };
    const functionId = createdFn.function_id;
    cleanup.defer(async () => {
      await client.functions.delete(functionId);
    });
    const functionGet = (await client.functions.get(functionId)) as Record<string, unknown>;
    const functionByName = (await client.functions.byName(functionName)) as Record<string, unknown>;
    await client.functions.deploy(functionId);
    const invocation = (await client.functions.invoke(functionId, {
      payload: '{"demo":true}',
      timeout_seconds: 15,
    })) as Record<string, unknown>;
    const invocations = await client.functions.listInvocations(functionId, {
      limit: 5,
    });
    const invocationId = String(invocation.invocation_id ?? "");
    const invocationGet = (await client.functions.getInvocation(
      functionId,
      invocationId,
    )) as Record<string, unknown>;
    const versions = await client.functions.listVersions(functionId);
    const pool = (await client.functions.pool(functionId)) as Record<string, unknown>;
    const poolStats = (await client.functions.poolStats()) as Record<string, unknown>;
    push("functions", true, [
      `function_id=${functionId}`,
      `state=${String(functionGet.state)}`,
      `by_name=${String(functionByName.id)}`,
      `invoke_status=${String(invocationGet.status)}`,
      `stdout=${String(invocationGet.stdout ?? "").trim()}`,
      `cold_start=${String(invocationGet.cold_start)}`,
      `invocations=${invocations.invocations.length}`,
      `versions=${versions.versions.length}`,
      `pool_ready=${String(pool.ready_count ?? "")}`,
      `pool_stats_keys=${Object.keys(poolStats).length}`,
    ]);
  } finally {
    await cleanup.run();
  }

  console.log("Containers, volumes, and network example summary");
  for (const result of results) {
    console.log(`- [${result.ok ? "pass" : "fail"}] ${result.chunk}`);
    for (const note of result.notes) {
      console.log(`  ${note}`);
    }
  }
  if (notes.length > 0) {
    console.log("Notes");
    for (const note of notes) {
      console.log(`- ${note}`);
    }
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

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForOperation(client: QuiltClient, operationId: string, timeoutMs = 120_000) {
  return await client.awaitOperation(operationId, {
    timeoutMs,
    intervalMs: 250,
  });
}

async function waitForJob(
  client: QuiltClient,
  containerId: string,
  jobId: string,
  timeoutMs = 60_000,
): Promise<Record<string, unknown>> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await client.platform.getContainerJob(containerId, jobId, true);
    const status = String(job.status ?? "");
    if (["completed", "failed", "timed_out"].includes(status)) {
      return job;
    }
    await sleep(250);
  }
  throw new Error(`job ${jobId} did not complete within ${timeoutMs}ms`);
}

async function readFirstSseEvent(client: QuiltClient, timeoutMs = 5_000): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const eventSource = client.events.openEventSource();
    const timer = setTimeout(() => {
      eventSource.close();
      reject(new Error("event stream timeout before first event"));
    }, timeoutMs);

    const finish = (value: string) => {
      clearTimeout(timer);
      eventSource.close();
      resolve(value);
    };

    eventSource.addEventListener("ready", () => {
      finish("event: ready");
    });

    eventSource.onerror = () => {
      clearTimeout(timer);
      eventSource.close();
      reject(new Error("event stream errored before first event"));
    };
  });
}

async function createPublicContainer(
  client: QuiltClient,
  namePrefix: string,
): Promise<{ containerId: string; name: string; operationId: string }> {
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
  return { containerId, name, operationId: accepted.operation_id };
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

async function createTarGzBase64(files: Array<{ path: string; content: string }>): Promise<string> {
  const root = await mkdtemp(join(tmpdir(), "quilt-demo-archive-"));
  try {
    for (const file of files) {
      const target = join(root, file.path);
      const dir = target.slice(0, Math.max(target.lastIndexOf("/"), 0));
      if (dir) {
        await mkdirRecursive(dir);
      }
      await writeFile(target, file.content, "utf8");
    }

    const tarball = join(root, "bundle.tar.gz");
    await spawnOk("tar", ["-czf", tarball, "-C", root, ...files.map((file) => file.path)]);
    const data = await readFile(tarball);
    return data.toString("base64");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

async function mkdirRecursive(path: string): Promise<void> {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(path, { recursive: true });
}

async function spawnOk(command: string, args: string[]): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk);
    });
    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(" ")} failed: ${stderr}`));
      }
    });
  });
}

main().catch((error) => {
  console.error("Containers, volumes, and network example failed");
  console.error(error);
  process.exitCode = 1;
});
