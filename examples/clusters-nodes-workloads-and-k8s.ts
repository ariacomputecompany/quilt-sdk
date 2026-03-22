import { QuiltClient } from "quilt-sdk";

const BASE_URL = process.env.QUILT_BASE_URL ?? "https://backend.quilt.sh";
const API_KEY = process.env.QUILT_API_KEY;
const JWT = process.env.QUILT_JWT;

type ClusterResponse = {
  id: string;
  name: string;
  pod_cidr: string;
  node_cidr_prefix: number;
  created_at: number;
};

type RegisterNodeResponse = {
  node: {
    id: string;
    name: string;
    state: string;
  };
  allocation: {
    pod_cidr: string;
    bridge_name: string;
    dns_port: number;
    egress_limit_mbit: number;
  };
  node_token: string;
};

type WorkloadResponse = {
  id: string;
  name: string;
  spec: {
    replicas: number;
    name: string;
  };
};

async function main(): Promise<void> {
  const cleanup = new CleanupStack();
  const client = createClient();
  const lines: string[] = [];

  const clusterName = suffix("cp-cluster");
  const nodeName = suffix("cp-node");
  const workloadName = suffix("cp-workload");
  const appName = suffix("cp-app");

  let clusterId = "";
  let workloadId = "";
  let nodeId = "";
  let nodeToken = "";

  try {
    const createdCluster = (await client.clusters.create({
      name: clusterName,
      pod_cidr: "10.88.0.0/16",
      node_cidr_prefix: 24,
    })) as ClusterResponse;
    clusterId = createdCluster.id;
    lines.push(`cluster created id=${clusterId}`);

    cleanup.defer(async () => {
      if (clusterId) {
        await client.clusters.delete(clusterId);
      }
    });

    const clusters = (await client.clusters.list()) as {
      clusters: ClusterResponse[];
    };
    const fetchedCluster = (await client.clusters.get(clusterId)) as ClusterResponse;
    const capabilities = (await client.clusters.getCapabilities(clusterId)) as Record<
      string,
      unknown
    >;
    assert(
      clusters.clusters.some((cluster) => cluster.id === clusterId),
      "cluster list missing cluster",
    );
    assert(fetchedCluster.id === clusterId, "cluster get mismatch");
    assert(Object.keys(capabilities).length > 0, "cluster capabilities empty");
    lines.push("cluster list/get/capabilities ok");

    const joinToken = await client.clusters.createJoinToken(clusterId, {
      ttl_secs: 600,
      max_uses: 1,
    });
    assert(joinToken.cluster_id === clusterId, "join token cluster mismatch");
    lines.push(`join token issued token_id=${joinToken.token_id}`);

    const registered = (await client.agent.registerNode(
      clusterId,
      {
        name: nodeName,
        public_ip: "203.0.113.10",
        private_ip: "10.0.0.10",
        agent_version: "verify-control-plane",
        labels: { suite: "control-plane" },
        bridge_name: "quilt0",
        dns_port: 1053,
        egress_limit_mbit: 1000,
      },
      { "X-Quilt-Join-Token": joinToken.join_token },
    )) as RegisterNodeResponse;
    nodeId = registered.node.id;
    nodeToken = registered.node_token;
    lines.push(`node registered id=${nodeId}`);

    cleanup.defer(async () => {
      if (clusterId && nodeId && nodeToken) {
        await client.agent.deregister(clusterId, nodeId, {
          "X-Quilt-Node-Token": nodeToken,
        });
      }
    });

    const nodes = (await client.clusters.listNodes(clusterId)) as {
      nodes: Array<{ id: string; name: string }>;
    };
    const nodeDetail = (await client.clusters.getNode(clusterId, nodeId)) as Record<
      string,
      unknown
    >;
    assert(
      nodes.nodes.some((node) => node.id === nodeId),
      "cluster nodes missing node",
    );
    assert(
      String((nodeDetail.node as Record<string, unknown>).id) === nodeId,
      "node detail mismatch",
    );
    lines.push("node list/detail ok");

    const heartbeat = (await client.agent.heartbeat(
      clusterId,
      nodeId,
      { state: "ready" },
      { "X-Quilt-Node-Token": nodeToken },
    )) as { success: boolean };
    const allocation = (await client.agent.getAllocation(clusterId, nodeId, {
      "X-Quilt-Node-Token": nodeToken,
    })) as Record<string, unknown>;
    assert(heartbeat.success === true, "node heartbeat failed");
    assert(String(allocation.bridge_name) === "quilt0", "node allocation bridge mismatch");
    lines.push("agent heartbeat/allocation ok");

    const createdWorkload = (await client.clusters.createWorkload(clusterId, {
      replicas: 1,
      name: workloadName,
      command: ["tail", "-f", "/dev/null"],
      image: "prod",
      environment: { CONTROL_PLANE: "1" },
      labels: { suite: "control-plane" },
      memory_limit_mb: 256,
      cpu_limit_percent: 25,
      strict: true,
    })) as WorkloadResponse;
    workloadId = createdWorkload.id;
    lines.push(`workload created id=${workloadId}`);

    const workloads = (await client.clusters.listWorkloads(clusterId)) as {
      workloads: WorkloadResponse[];
    };
    const fetchedWorkload = (await client.clusters.getWorkload(
      clusterId,
      workloadId,
    )) as WorkloadResponse;
    assert(
      workloads.workloads.some((workload) => workload.id === workloadId),
      "workload list missing workload",
    );
    assert(fetchedWorkload.id === workloadId, "workload get mismatch");

    const placements = (await client.clusters.listPlacements(clusterId)) as {
      placements: Array<Record<string, unknown>>;
    };
    const nodePlacements = (await client.agent.listPlacements(clusterId, nodeId, {
      "X-Quilt-Node-Token": nodeToken,
    })) as { assignments: Array<Record<string, unknown>> };
    const placement = nodePlacements.assignments.find(
      (entry) =>
        String(
          ((entry.placement as Record<string, unknown>)?.workload_id as string | undefined) ?? "",
        ) === workloadId,
    );
    assert(placements.placements.length >= 1, "tenant placements empty");
    assert(placement, "agent placements missing workload assignment");
    const placementId = String((placement.placement as Record<string, unknown>).id);

    const report = (await client.agent.reportPlacement(
      clusterId,
      nodeId,
      placementId,
      {
        container_id: "agent-reported-container",
        state: "running",
        message: "placement started",
      },
      { "X-Quilt-Node-Token": nodeToken },
    )) as { success: boolean };
    assert(report.success === true, "placement report failed");
    lines.push(`workload placements/report ok placement=${placementId}`);

    const updatedWorkload = (await client.clusters.updateWorkload(clusterId, workloadId, {
      replicas: 2,
      name: workloadName,
      command: ["tail", "-f", "/dev/null"],
      image: "prod",
      environment: { CONTROL_PLANE: "2" },
      labels: { suite: "control-plane", updated: "true" },
      memory_limit_mb: 256,
      cpu_limit_percent: 25,
      strict: true,
    })) as WorkloadResponse;
    const reconcile = (await client.clusters.reconcile(clusterId)) as {
      success: boolean;
    };
    assert(updatedWorkload.spec.replicas === 2, "workload update did not persist");
    assert(reconcile.success === true, "cluster reconcile failed");
    lines.push("workload update/reconcile ok");

    const manifest = [
      "apiVersion: apps/v1",
      "kind: Deployment",
      "metadata:",
      `  name: ${appName}`,
      "spec:",
      "  replicas: 1",
      "  selector:",
      "    matchLabels:",
      `      app: ${appName}`,
      "  template:",
      "    metadata:",
      "      labels:",
      `        app: ${appName}`,
      "    spec:",
      "      containers:",
      "        - image: prod",
      "          command:",
      "            - tail",
      "            - -f",
      "            - /dev/null",
      "",
    ].join("\n");

    const validate = (await client.raw("post", "/api/k8s/validate", {
      body: { manifest },
    })) as Record<string, unknown>;
    const diff = (await client.raw("post", "/api/k8s/diff", {
      body: {
        cluster_id: clusterId,
        application: "default",
        manifest,
      },
    })) as Record<string, unknown>;
    const apply = (await client.raw("post", "/api/k8s/apply", {
      body: {
        cluster_id: clusterId,
        application: "default",
        manifest,
      },
    })) as { operation_id: string };
    const status = (await client.raw("get", `/api/k8s/applies/${apply.operation_id}`, {
      query: { cluster_id: clusterId },
    })) as Record<string, unknown>;
    const resources = (await client.raw("get", "/api/k8s/resources", {
      query: { cluster_id: clusterId, application: "default" },
    })) as Record<string, unknown>;
    const exported = (await client.raw("post", "/api/k8s/export", {
      body: { cluster_id: clusterId, application: "default" },
    })) as Record<string, unknown>;
    assert(Object.keys(validate).length > 0, "k8s validate empty");
    assert(Object.keys(diff).length > 0, "k8s diff empty");
    assert(Object.keys(status).length > 0, "k8s status empty");
    assert(Object.keys(resources).length > 0, "k8s resources empty");
    assert(Object.keys(exported).length > 0, "k8s export empty");
    lines.push(`k8s validate/diff/apply/resource/export ok operation=${apply.operation_id}`);
  } finally {
    await cleanup.run();
  }

  console.log("Clusters, nodes, workloads, and k8s example summary");
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

main().catch((error) => {
  console.error("Clusters, nodes, workloads, and k8s example failed");
  console.error(error);
  process.exitCode = 1;
});
