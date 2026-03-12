import type { QuiltClient } from "../core/client";

export class ClustersModule {
  public constructor(private readonly client: QuiltClient) {}

  public list() {
    return this.client.get("/api/clusters");
  }

  public create(body: {
    name: string;
    region?: string;
    desired_nodes?: number;
    labels?: Record<string, string>;
  }) {
    return this.client.post("/api/clusters", { body });
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
      name: string;
      image: string;
      replicas?: number;
      command?: string[];
      env?: Record<string, string>;
      resources?: {
        cpu_millis?: number;
        memory_mb?: number;
      };
      labels?: Record<string, string>;
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
      image?: string;
      command?: string[];
      env?: Record<string, string>;
      resources?: {
        cpu_millis?: number;
        memory_mb?: number;
      };
      labels?: Record<string, string>;
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
