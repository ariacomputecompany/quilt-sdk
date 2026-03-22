import { QuiltClient } from "quilt-sdk";

const BASE_URL = process.env.QUILT_BASE_URL ?? "https://backend.quilt.sh";
const API_KEY = process.env.QUILT_API_KEY;
const JWT = process.env.QUILT_JWT;
const OCI_REFERENCE = "docker.io/library/alpine:3.20";

async function main(): Promise<void> {
  const client = createClient();
  const cleanup = new CleanupStack();
  const lines: string[] = [];

  try {
    const pulled = (await client.platform.ociPull({
      reference: OCI_REFERENCE,
    })) as {
      success?: boolean;
      error_message?: string;
      image?: Record<string, unknown>;
    };
    assert(
      pulled.success === true,
      `OCI pull failed: ${String(pulled.error_message ?? "unknown")}`,
    );
    assert(pulled.image, "OCI pull did not return image metadata");
    lines.push(`pull ok reference=${OCI_REFERENCE}`);

    const listed = (await client.platform.ociList({
      filter: "alpine",
      include_digests: true,
    })) as {
      images?: Array<Record<string, unknown>>;
    };
    const listedImage = listed.images?.find((image) => {
      return (
        String(image.registry ?? "") === "docker.io" &&
        String(image.repository ?? "") === "library/alpine" &&
        String(image.tag ?? "") === "3.20"
      );
    });
    assert(listedImage, "pulled OCI image was not listed");
    lines.push(`list ok images=${listed.images?.length ?? 0}`);

    const inspected = (await client.platform.ociInspect(OCI_REFERENCE)) as {
      image?: Record<string, unknown>;
      layers?: Array<Record<string, unknown>>;
      manifest_json?: string;
      config_json?: string;
    };
    assert(
      String(inspected.image?.repository ?? "") === "library/alpine",
      "inspect repository mismatch",
    );
    assert(
      Array.isArray(inspected.layers) && inspected.layers.length > 0,
      "inspect layers missing",
    );
    assert(String(inspected.manifest_json ?? "").length > 0, "manifest_json missing");
    assert(String(inspected.config_json ?? "").length > 0, "config_json missing");
    lines.push(`inspect ok layers=${inspected.layers.length}`);

    const history = (await client.platform.ociHistory(OCI_REFERENCE)) as {
      history?: Array<Record<string, unknown>>;
    };
    assert(Array.isArray(history.history) && history.history.length > 0, "image history missing");
    lines.push(`history ok entries=${history.history.length}`);

    const name = suffix("oci-image");
    const accepted = await client.containers.create(
      {
        name,
        image: OCI_REFERENCE,
        oci: true,
        command: ["sleep", "60"],
        working_directory: "/",
        memory_limit_mb: 256,
        cpu_limit_percent: 25,
        strict: false,
      },
      "async",
    );
    const operationId = String(accepted.operation_id ?? "");
    assert(operationId, "container create operation_id missing");
    const operation = await client.awaitOperation(operationId, { timeoutMs: 180_000 });
    assert(operation.status === "succeeded", `OCI container create failed: ${operation.status}`);

    const containerId =
      typeof accepted.container_id === "string" && accepted.container_id.length > 0
        ? accepted.container_id
        : String((await client.containers.byName(name)).container_id ?? "");
    assert(containerId, "created OCI container id missing");
    cleanup.defer(async () => deletePublicContainer(client, containerId));
    lines.push(`container create ok operation=${operationId} id=${containerId}`);

    const execAccepted = (await client.containers.exec(containerId, {
      command: ["sh", "-lc", "echo oci-image-ok"],
      workdir: "/",
      timeout_ms: 30_000,
    })) as { job_id?: string };
    const jobId = String(execAccepted.job_id ?? "");
    assert(jobId, "OCI exec job_id missing");
    const execJob = await waitForJob(client, containerId, jobId);
    assert(String(execJob.status ?? "") === "completed", "OCI exec did not complete");
    assert(String(execJob.stdout ?? "").includes("oci-image-ok"), "OCI exec stdout mismatch");
    lines.push(`container exec ok job=${jobId}`);
  } finally {
    await cleanup.run();
  }

  console.log("Docker and OCI images example summary");
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
      } catch {
        // Cleanup should not mask test results.
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
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const job = await client.platform.getContainerJob(containerId, jobId, true);
    const status = String(job.status ?? "");
    if (status === "completed" || status === "failed" || status === "timed_out") {
      return job;
    }
    await sleep(500);
  }
  throw new Error(`Timed out waiting for job ${jobId}`);
}

async function deletePublicContainer(client: QuiltClient, containerId: string): Promise<void> {
  try {
    const accepted = await client.containers.remove(containerId, "async");
    const operationId = String(accepted.operation_id ?? "");
    if (operationId) {
      await client.awaitOperation(operationId, { timeoutMs: 60_000 });
    }
  } catch {
    // Cleanup should not mask test results.
  }
}

await main();
