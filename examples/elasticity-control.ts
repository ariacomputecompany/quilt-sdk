import { QuiltClient } from "quilt-sdk";

const BASE_URL = process.env.QUILT_BASE_URL ?? "https://backend.quilt.sh";
const API_KEY = process.env.QUILT_API_KEY;
const JWT = process.env.QUILT_JWT;

async function main(): Promise<void> {
  const cleanup = new CleanupStack();
  const client = createClient();
  const lines: string[] = [];

  const { containerId, operationId } = await createPublicContainer(client, "elasticity-example");
  cleanup.defer(async () => deletePublicContainer(client, containerId));
  lines.push(`container created operation=${operationId} id=${containerId}`);

  const container = (await client.containers.get(containerId)) as Record<string, unknown>;
  const tenantId = String(container.tenant_id ?? "");
  assert(tenantId, "container tenant_id missing");
  const controlHeaders = { "X-Tenant-Id": tenantId };

  try {
    const functionName = suffix("elastic-fn");
    const functionCreate = await client.functions.create({
      name: functionName,
      handler: "echo elasticity-function-ok",
      runtime: "shell",
      memory_limit_mb: 256,
      cpu_limit_percent: 25,
      timeout_seconds: 15,
      min_instances: 0,
      max_instances: 1,
      cleanup_on_exit: true,
    });
    const functionId = functionCreate.function_id;
    assert(functionId, "function_id missing");
    cleanup.defer(async () => {
      await client.functions.delete(functionId);
    });
    await client.functions.deploy(functionId);

    const nodeStatus = await client.elasticity.nodeStatus(controlHeaders);
    assert(typeof nodeStatus.status === "string", "elastic node status missing");

    const resizedContainer = await client.elasticity.resizeContainer(
      containerId,
      {
        memory_limit_mb: 384,
        cpu_limit_percent: 35,
      },
      controlHeaders,
    );
    assert(resizedContainer.container_id === containerId, "elastic resize container mismatch");

    const setPool = await client.elasticity.setFunctionPoolTarget(
      functionId,
      {
        min_instances: 0,
        max_instances: 2,
      },
      controlHeaders,
    );
    assert(setPool.function_id === functionId, "elastic function pool target mismatch");

    const resizeActionId = suffix("elastic-resize-action");
    const controlResize = await client.elasticity.controlResizeContainer(
      containerId,
      {
        memory_limit_mb: 448,
        cpu_limit_percent: 40,
      },
      {
        ...controlHeaders,
        "Idempotency-Key": suffix("idem"),
        "X-Orch-Action-Id": resizeActionId,
      },
    );
    const controlOperationId = controlResize.operation_id;
    assert(controlOperationId, "control resize operation_id missing");

    const controlGet = await client.elasticity.controlGetOperation(
      controlOperationId,
      controlHeaders,
    );
    const controlByAction = await client.elasticity.controlListActionOperations(
      resizeActionId,
      controlHeaders,
    );
    assert(controlGet.operation_id === controlOperationId, "control get mismatch");
    assert(
      controlByAction.some(
        (operation: { operation_id: string }) => operation.operation_id === controlOperationId,
      ),
      "control by action missing operation",
    );

    const controlPoolActionId = suffix("elastic-pool-action");
    const controlPool = await client.elasticity.controlSetFunctionPoolTarget(
      functionId,
      {
        min_instances: 0,
        max_instances: 1,
      },
      {
        ...controlHeaders,
        "Idempotency-Key": suffix("idem"),
        "X-Orch-Action-Id": controlPoolActionId,
      },
    );
    assert(
      controlPool.operation_type.includes("pool_target"),
      "control pool operation type mismatch",
    );

    const cluster = (await client.clusters.create({
      name: suffix("elastic-cluster"),
      pod_cidr: "10.99.0.0/16",
      node_cidr_prefix: 24,
    })) as { id: string };
    const clusterId = cluster.id;
    assert(clusterId, "elastic cluster create failed");
    cleanup.defer(async () => {
      await client.clusters.delete(clusterId);
    });

    const workload = (await client.clusters.createWorkload(clusterId, {
      replicas: 1,
      name: suffix("elastic-workload"),
      command: ["tail", "-f", "/dev/null"],
      image: "prod",
      environment: {},
      labels: { suite: "elasticity" },
      memory_limit_mb: 256,
      cpu_limit_percent: 25,
      strict: true,
    })) as { id: string };
    const workloadId = workload.id;
    assert(workloadId, "elastic workload create failed");
    cleanup.defer(async () => {
      await client.clusters.deleteWorkload(clusterId, workloadId);
    });

    const binding = await client.elasticity.controlPutWorkloadFunctionBinding(
      workloadId,
      { function_id: functionId },
      controlHeaders,
    );
    const bindingGet = await client.elasticity.controlGetWorkloadFunctionBinding(
      workloadId,
      controlHeaders,
    );
    assert(binding.current_function_id === functionId, "workload binding put mismatch");
    assert(bindingGet.current_function_id === functionId, "workload binding get mismatch");

    const placementActionId = suffix("elastic-placement-action");
    const placementSet = await client.elasticity.controlPutWorkloadPlacementPreference(
      workloadId,
      {
        node_group: "group-a",
        anti_affinity: true,
      },
      {
        ...controlHeaders,
        "Idempotency-Key": suffix("idem"),
        "X-Orch-Action-Id": placementActionId,
      },
    );
    const placementGet = await client.elasticity.controlGetWorkloadPlacementPreference(
      workloadId,
      controlHeaders,
    );
    assert(
      placementSet.operation_type.includes("placement_preference"),
      "placement preference operation type mismatch",
    );
    assert(placementGet.node_group === "group-a", "placement preference node_group mismatch");

    const nextFunction = await client.functions.create({
      name: suffix("elastic-next-fn"),
      handler: "echo elasticity-next-function-ok",
      runtime: "shell",
      memory_limit_mb: 256,
      cpu_limit_percent: 25,
      timeout_seconds: 15,
      min_instances: 0,
      max_instances: 1,
      cleanup_on_exit: true,
    });
    const nextFunctionId = nextFunction.function_id;
    assert(nextFunctionId, "next function create failed");
    cleanup.defer(async () => {
      await client.functions.delete(nextFunctionId);
    });
    await client.functions.deploy(nextFunctionId);

    const rotated = await client.elasticity.controlRotateWorkloadFunctionBinding(
      workloadId,
      {
        next_function_id: nextFunctionId,
        cutover_at: Math.floor(Date.now() / 1000) + 300,
      },
      controlHeaders,
    );
    assert(rotated.next_function_id === nextFunctionId, "workload binding rotate mismatch");

    const scaleActionId = suffix("elastic-scale-action");
    const nodeGroupScale = await client.elasticity.controlScaleNodeGroup(
      "group-a",
      { delta_units: 1 },
      {
        ...controlHeaders,
        "Idempotency-Key": suffix("idem"),
        "X-Orch-Action-Id": scaleActionId,
      },
    );
    assert(
      nodeGroupScale.operation_type.includes("scale_node_group"),
      "node group scale operation type mismatch",
    );

    const rollbackActionId = suffix("elastic-rollback-action");
    const rollback = await client.elasticity.controlRollbackAction(
      resizeActionId,
      {
        reason: "demo rollback request",
      },
      {
        ...controlHeaders,
        "Idempotency-Key": suffix("idem"),
        "X-Orch-Action-Id": rollbackActionId,
      },
    );
    assert(rollback.operation_type.includes("rollback_action"), "rollback operation type mismatch");

    const contract = await client.elasticity.controlContract(controlHeaders);
    assert(typeof contract.control_base_url === "string", "control contract base URL missing");
    assert(
      typeof contract.paths === "object" && contract.paths !== null,
      "control contract paths missing",
    );

    lines.push(
      "elastic node status, resize, pool target, placement preference, binding, scale, rollback, and contract ok",
    );
  } finally {
    await cleanup.run();
  }

  console.log("Elasticity control example summary");
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

main().catch((error) => {
  console.error("Elasticity control example failed");
  console.error(error);
  process.exitCode = 1;
});
