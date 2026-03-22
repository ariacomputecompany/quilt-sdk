import type { QuiltClient } from "../core/client";

export interface CreateJoinTokenResponse {
  token_id: string;
  cluster_id: string;
  join_token: string;
  expires_at: number;
  max_uses: number;
}

export class ClustersModule {
  public constructor(private readonly client: QuiltClient) {}

  public list() {
    return this.client.get("/api/clusters");
  }

  public create(body: {
    name: string;
    pod_cidr: string;
    node_cidr_prefix: number;
  }) {
    return this.client.post("/api/clusters", { body });
  }

  public getCapabilities(clusterId: string) {
    return this.client.raw<Record<string, unknown>>(
      "get",
      "/api/clusters/{cluster_id}/capabilities",
      {
        pathParams: { cluster_id: clusterId },
      },
    );
  }

  public createJoinToken(clusterId: string, body: { ttl_secs: number; max_uses: number }) {
    return this.client.raw<CreateJoinTokenResponse>(
      "post",
      "/api/clusters/{cluster_id}/join-tokens",
      {
        pathParams: { cluster_id: clusterId },
        body,
      },
    );
  }

  public get(clusterId: string) {
    return this.client.get("/api/clusters/{cluster_id}", {
      pathParams: { cluster_id: clusterId },
    });
  }

  public delete(clusterId: string) {
    return this.client.delete("/api/clusters/{cluster_id}", {
      pathParams: { cluster_id: clusterId },
    });
  }

  public reconcile(clusterId: string) {
    return this.client.post("/api/clusters/{cluster_id}/reconcile", {
      pathParams: { cluster_id: clusterId },
    });
  }

  public listNodes(clusterId: string) {
    return this.client.get("/api/clusters/{cluster_id}/nodes", {
      pathParams: { cluster_id: clusterId },
    });
  }

  public getNode(clusterId: string, nodeId: string) {
    return this.client.get("/api/clusters/{cluster_id}/nodes/{node_id}", {
      pathParams: { cluster_id: clusterId, node_id: nodeId },
    });
  }

  public drainNode(clusterId: string, nodeId: string) {
    return this.client.post("/api/clusters/{cluster_id}/nodes/{node_id}/drain", {
      pathParams: { cluster_id: clusterId, node_id: nodeId },
    });
  }

  public deleteNode(clusterId: string, nodeId: string) {
    return this.client.delete("/api/clusters/{cluster_id}/nodes/{node_id}", {
      pathParams: { cluster_id: clusterId, node_id: nodeId },
    });
  }

  public listWorkloads(clusterId: string) {
    return this.client.get("/api/clusters/{cluster_id}/workloads", {
      pathParams: { cluster_id: clusterId },
    });
  }

  public createWorkload(
    clusterId: string,
    body: {
      replicas: number;
      name: string;
      image: string;
      command?: string[];
      environment?: Record<string, string>;
      labels?: Record<string, string>;
      memory_limit_mb?: number;
      cpu_limit_percent?: number;
      strict?: boolean;
    },
  ) {
    return this.client.post("/api/clusters/{cluster_id}/workloads", {
      pathParams: { cluster_id: clusterId },
      body,
    });
  }

  public getWorkload(clusterId: string, workloadId: string) {
    return this.client.get("/api/clusters/{cluster_id}/workloads/{workload_id}", {
      pathParams: { cluster_id: clusterId, workload_id: workloadId },
    });
  }

  public updateWorkload(
    clusterId: string,
    workloadId: string,
    body: {
      replicas?: number;
      name?: string;
      image?: string;
      command?: string[];
      environment?: Record<string, string>;
      labels?: Record<string, string>;
      memory_limit_mb?: number;
      cpu_limit_percent?: number;
      strict?: boolean;
    },
  ) {
    return this.client.put("/api/clusters/{cluster_id}/workloads/{workload_id}", {
      pathParams: { cluster_id: clusterId, workload_id: workloadId },
      body,
    });
  }

  public deleteWorkload(clusterId: string, workloadId: string) {
    return this.client.delete("/api/clusters/{cluster_id}/workloads/{workload_id}", {
      pathParams: { cluster_id: clusterId, workload_id: workloadId },
    });
  }

  public listPlacements(clusterId: string) {
    return this.client.get("/api/clusters/{cluster_id}/placements", {
      pathParams: { cluster_id: clusterId },
    });
  }
}
