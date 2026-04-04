import { QuiltClient } from "quilt-sdk";

const BASE_URL = process.env.QUILT_BASE_URL ?? "https://backend.quilt.sh";
const API_KEY = process.env.QUILT_API_KEY;
const JWT = process.env.QUILT_JWT;

async function main(): Promise<void> {
  const cleanup = new CleanupStack();
  const client = createClient();
  const lines: string[] = [];

  try {
    const health = (await client.system.health()) as Record<string, unknown>;
    const info = (await client.system.info()) as Record<string, unknown>;
    assert(String(health.status) === "ok", "SDK health failed");
    assert(Object.keys(info).length > 0, "SDK system info empty");
    lines.push(`system.health=${String(health.status)}`);

    const { containerId, name, operationId } = await createPublicContainer(client, "sdk-verify");
    cleanup.defer(async () => deletePublicContainer(client, containerId));
    lines.push(`public create ok operation=${operationId} container=${containerId}`);
    await waitForContainerReady(client, containerId);

    const listed = (await client.containers.list()) as {
      containers: Array<Record<string, unknown>>;
    };
    const fetched = (await client.containers.get(containerId)) as Record<string, unknown>;
    const byName = (await client.containers.byName(name)) as Record<string, unknown>;
    const ready = await client.platform.checkContainerReady(containerId);
    assert(Array.isArray(listed.containers), "SDK container list malformed");
    assert(String(fetched.container_id) === containerId, "SDK container get mismatch");
    assert(String(byName.container_id) === containerId, "SDK byName mismatch");
    assert(ready.exec_ready === true, "SDK ready check failed");
    lines.push(
      `containers.get/byName/ready ok for ${name} exec_ready=${ready.exec_ready} network_ready=${ready.network_ready}`,
    );

    await client.platform.patchContainerEnv(containerId, {
      SDK_PATCH: "1",
      SDK_KEEP: "yes",
    });
    const envPatched = await client.platform.getContainerEnv(containerId);
    assert(envPatched.environment.SDK_PATCH === "1", "SDK env patch missing");
    await client.platform.replaceContainerEnv(containerId, {
      SDK_REPLACED: "true",
    });
    const envReplaced = await client.platform.getContainerEnv(containerId);
    assert(envReplaced.environment.SDK_REPLACED === "true", "SDK env replace missing");
    assert(!("SDK_KEEP" in envReplaced.environment), "SDK env replace retained old key");
    lines.push("platform env patch/replace ok");

    const execAccepted = (await client.containers.exec(containerId, {
      command: ["sh", "-lc", "echo sdk-exec-ok"],
      workdir: "/",
      timeout_ms: 10_000,
    })) as { job_id: string };
    const execJob = await waitForJob(client, containerId, execAccepted.job_id);
    assert(String(execJob.status) === "completed", "SDK exec did not complete");
    assert(String(execJob.stdout ?? "").includes("sdk-exec-ok"), "SDK exec stdout mismatch");
    const jobs = await client.platform.listContainerJobs(containerId);
    assert(Array.isArray(jobs.jobs) && jobs.jobs.length > 0, "SDK job list empty");
    lines.push(`containers.exec ok job=${execAccepted.job_id}`);

    const volumeName = suffix("sdk-vol");
    await client.volumes.create({
      name: volumeName,
      driver: "local",
      labels: { suite: "sdk" },
    });
    cleanup.defer(async () => {
      try {
        const accepted = (await client.volumes.delete(volumeName, "async")) as {
          operation_id?: string;
        };
        if (accepted.operation_id) {
          await client.awaitOperation(accepted.operation_id, {
            timeoutMs: 60_000,
          });
        }
      } catch {
        // Cleanup should not mask test results.
      }
    });
    await client.platform.putVolumeFile(volumeName, {
      path: "/sdk.txt",
      content: Buffer.from("sdk-volume-ok", "utf8").toString("base64"),
      mode: 0o644,
    });
    const volumeFile = await client.platform.getVolumeFile(volumeName, "sdk.txt");
    assert(
      Buffer.from(volumeFile.content, "base64").toString("utf8") === "sdk-volume-ok",
      "SDK volume file mismatch",
    );
    const volumeInspect = await client.volumes.inspect(volumeName);
    const volumeLs = (await client.volumes.listFiles(volumeName)) as {
      files: Array<Record<string, unknown>>;
    };
    assert(Object.keys(volumeInspect).length > 0, "SDK volume inspect empty");
    assert(Array.isArray(volumeLs.files), "SDK volume ls malformed");
    lines.push(`volumes create/file/inspect ok name=${volumeName}`);

    const functionName = suffix("sdk-fn");
    const createdFn = (await client.functions.create({
      name: functionName,
      handler: "echo sdk-function-ok",
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
    await client.functions.deploy(functionId);
    const fnGet = (await client.functions.get(functionId)) as Record<string, unknown>;
    const fnByName = (await client.functions.byName(functionName)) as Record<string, unknown>;
    const invocation = (await client.functions.invoke(functionId, {
      payload: '{"sdk":true}',
      timeout_seconds: 15,
    })) as Record<string, unknown>;
    const invocationId = String(invocation.invocation_id ?? "");
    const invocationGet = (await client.functions.getInvocation(
      functionId,
      invocationId,
    )) as Record<string, unknown>;
    const versions = (await client.functions.listVersions(functionId)) as {
      versions: Array<Record<string, unknown>>;
    };
    const pool = (await client.functions.pool(functionId)) as Record<string, unknown>;
    const poolStats = (await client.functions.poolStats()) as Record<string, unknown>;
    assert(String(fnGet.id) === functionId, "SDK function get mismatch");
    assert(String(fnByName.id) === functionId, "SDK function by-name mismatch");
    assert(String(invocationGet.status) === "success", "SDK function invoke status mismatch");
    assert(
      String(invocationGet.stdout ?? "").includes("sdk-function-ok"),
      "SDK function stdout mismatch",
    );
    assert(
      Array.isArray(versions.versions) && versions.versions.length >= 1,
      "SDK version list empty",
    );
    assert(Object.keys(pool).length > 0, "SDK pool empty");
    assert(Object.keys(poolStats).length > 0, "SDK pool stats empty");
    lines.push(`functions create/deploy/invoke ok function=${functionId}`);

    const rawOps = (await client.raw<Record<string, unknown>>(
      "get",
      `/api/containers/${containerId}/network`,
    )) as Record<string, unknown>;
    assert(Object.keys(rawOps).length > 0, "SDK raw request returned empty payload");
    lines.push("client.raw authenticated path ok");
  } finally {
    await cleanup.run();
  }

  console.log("SDK runtime and functions example summary");
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

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
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
  throw new Error(`SDK job ${jobId} did not complete within ${timeoutMs}ms`);
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

async function waitForContainerReady(
  client: QuiltClient,
  containerId: string,
  timeoutMs = 180_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = await client.platform.checkContainerReady(containerId);
    if (ready.exec_ready === true && ready.network_ready === true) {
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`container ${containerId} did not become ready within ${timeoutMs}ms`);
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

main().catch((error) => {
  console.error("SDK runtime and functions example failed");
  console.error(error);
  process.exitCode = 1;
});
