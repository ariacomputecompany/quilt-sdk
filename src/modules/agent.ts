import type { QuiltClient } from "../core/client";
import type { JsonRequestBody, SuccessResponse } from "../types/surface";

export interface AgentAuthHeaders extends Record<string, string> {
  "X-Quilt-Join-Token"?: string;
  "X-Quilt-Node-Token"?: string;
}

export type RegisterNodeRequest = JsonRequestBody<
  "/api/agent/clusters/{cluster_id}/nodes/register",
  "post"
>;
export type RegisterNodeResponse = SuccessResponse<
  "/api/agent/clusters/{cluster_id}/nodes/register",
  "post"
>;
export type HeartbeatRequest = JsonRequestBody<
  "/api/agent/clusters/{cluster_id}/nodes/{node_id}/heartbeat",
  "post"
>;
export type PlacementReportRequest = JsonRequestBody<
  "/api/agent/clusters/{cluster_id}/nodes/{node_id}/placements/{placement_id}/report",
  "post"
>;

export class AgentModule {
  public constructor(private readonly client: QuiltClient) {}

  public registerNode(
    clusterId: string,
    body: RegisterNodeRequest,
    headers?: AgentAuthHeaders,
  ): Promise<RegisterNodeResponse> {
    return this.client.raw("post", "/api/agent/clusters/{cluster_id}/nodes/register", {
      pathParams: { cluster_id: clusterId },
      headers,
      body,
    });
  }

  public heartbeat(
    clusterId: string,
    nodeId: string,
    body: HeartbeatRequest,
    headers?: AgentAuthHeaders,
  ) {
    return this.client.raw("post", "/api/agent/clusters/{cluster_id}/nodes/{node_id}/heartbeat", {
      pathParams: { cluster_id: clusterId, node_id: nodeId },
      headers,
      body,
    });
  }

  public getAllocation(clusterId: string, nodeId: string, headers?: AgentAuthHeaders) {
    return this.client.raw("get", "/api/agent/clusters/{cluster_id}/nodes/{node_id}/allocation", {
      pathParams: { cluster_id: clusterId, node_id: nodeId },
      headers,
    });
  }

  public listPlacements(clusterId: string, nodeId: string, headers?: AgentAuthHeaders) {
    return this.client.raw("get", "/api/agent/clusters/{cluster_id}/nodes/{node_id}/placements", {
      pathParams: { cluster_id: clusterId, node_id: nodeId },
      headers,
    });
  }

  public reportPlacement(
    clusterId: string,
    nodeId: string,
    placementId: string,
    body: PlacementReportRequest,
    headers?: AgentAuthHeaders,
  ) {
    return this.client.raw(
      "post",
      "/api/agent/clusters/{cluster_id}/nodes/{node_id}/placements/{placement_id}/report",
      {
        pathParams: {
          cluster_id: clusterId,
          node_id: nodeId,
          placement_id: placementId,
        },
        headers,
        body,
      },
    );
  }

  public deregister(clusterId: string, nodeId: string, headers?: AgentAuthHeaders) {
    return this.client.raw("post", "/api/agent/clusters/{cluster_id}/nodes/{node_id}/deregister", {
      pathParams: { cluster_id: clusterId, node_id: nodeId },
      headers,
    });
  }
}
