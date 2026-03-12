import type { QuiltClient } from "../core/client";

export class AgentModule {
  public constructor(private readonly client: QuiltClient) {}

  public registerNode(clusterId: string, body: Record<string, unknown>) {
    return this.client.post("/api/agent/clusters/{cluster_id}/nodes/register", {
      pathParams: { cluster_id: clusterId },
      body,
    });
  }

  public heartbeat(clusterId: string, nodeId: string, body: Record<string, unknown>) {
    return this.client.post("/api/agent/clusters/{cluster_id}/nodes/{node_id}/heartbeat", {
      pathParams: { cluster_id: clusterId, node_id: nodeId },
      body,
    });
  }

  public getAllocation(clusterId: string, nodeId: string) {
    return this.client.get("/api/agent/clusters/{cluster_id}/nodes/{node_id}/allocation", {
      pathParams: { cluster_id: clusterId, node_id: nodeId },
    });
  }

  public listPlacements(clusterId: string, nodeId: string) {
    return this.client.get("/api/agent/clusters/{cluster_id}/nodes/{node_id}/placements", {
      pathParams: { cluster_id: clusterId, node_id: nodeId },
    });
  }

  public reportPlacement(
    clusterId: string,
    nodeId: string,
    placementId: string,
    body: Record<string, unknown>,
  ) {
    return this.client.post(
      "/api/agent/clusters/{cluster_id}/nodes/{node_id}/placements/{placement_id}/report",
      {
        pathParams: {
          cluster_id: clusterId,
          node_id: nodeId,
          placement_id: placementId,
        },
        body,
      },
    );
  }

  public deregister(clusterId: string, nodeId: string) {
    return this.client.post("/api/agent/clusters/{cluster_id}/nodes/{node_id}/deregister", {
      pathParams: { cluster_id: clusterId, node_id: nodeId },
    });
  }
}
