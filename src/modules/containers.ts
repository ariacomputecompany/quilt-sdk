import type { QuiltClient } from "../core/client";
import type { JsonRequestBody, SuccessResponse } from "../types/surface";

export type CreateContainerRequest = JsonRequestBody<"/api/containers", "post">;
export type CreateContainerBatchRequest = JsonRequestBody<"/api/containers/batch", "post">;
export type ContainerStatus = SuccessResponse<"/api/containers/{id}", "get">;
export type ContainerReadyResponse = SuccessResponse<"/api/containers/{id}/ready", "get">;
export type ContainerNetworkUpdateRequest = JsonRequestBody<"/api/containers/{id}/network", "put">;
export type ContainerSnapshotRequest = JsonRequestBody<"/api/containers/{id}/snapshot", "post">;
export type ContainerSnapshotResponse = SuccessResponse<"/api/containers/{id}/snapshot", "post">;

export class ContainersModule {
  public constructor(private readonly client: QuiltClient) {}

  public list(query?: { state?: string }) {
    return this.client.get("/api/containers", { query });
  }

  public create(body: CreateContainerRequest, execution: "sync" | "async" = "async") {
    return this.client.post("/api/containers", {
      query: { execution },
      body,
    });
  }

  public createBatch(body: CreateContainerBatchRequest, execution: "sync" | "async" = "async") {
    return this.client.post("/api/containers/batch", {
      query: { execution },
      body,
    });
  }

  public get(identifier: string) {
    return this.client.get("/api/containers/{id}", { pathParams: { id: identifier } });
  }

  public remove(identifier: string, execution: "sync" | "async" = "async") {
    return this.client.delete("/api/containers/{id}", {
      pathParams: { id: identifier },
      query: { execution },
    });
  }

  public start(identifier: string) {
    return this.client.post("/api/containers/{id}/start", { pathParams: { id: identifier } });
  }

  public stop(identifier: string, execution: "sync" | "async" = "async") {
    return this.client.post("/api/containers/{id}/stop", {
      pathParams: { id: identifier },
      query: { execution },
    });
  }

  public resume(identifier: string, execution: "sync" | "async" = "async") {
    return this.client.raw<Record<string, unknown>>("post", "/api/containers/{id}/resume", {
      pathParams: { id: identifier },
      query: { execution },
    });
  }

  public kill(identifier: string) {
    return this.client.post("/api/containers/{id}/kill", { pathParams: { id: identifier } });
  }

  public exec(
    identifier: string,
    body: {
      command: string[];
      workdir?: string;
      capture_output?: boolean;
      timeout_ms?: number;
      detach?: boolean;
    },
  ) {
    return this.client.post("/api/containers/{id}/exec", {
      pathParams: { id: identifier },
      body,
    });
  }

  public logs(identifier: string, query?: { limit?: number }) {
    return this.client.get("/api/containers/{id}/logs", {
      pathParams: { id: identifier },
      query,
    });
  }

  public metrics(identifier: string) {
    return this.client.get("/api/containers/{id}/metrics", {
      pathParams: { id: identifier },
    });
  }

  public ready(identifier: string) {
    return this.client.get("/api/containers/{id}/ready", {
      pathParams: { id: identifier },
    });
  }

  public networkDiagnostics(identifier: string) {
    return this.client.get("/api/containers/{id}/network/diagnostics", {
      pathParams: { id: identifier },
    });
  }

  public networkGet(identifier: string) {
    return this.client.get("/api/containers/{id}/network", {
      pathParams: { id: identifier },
    });
  }

  public networkSet(identifier: string, body: ContainerNetworkUpdateRequest) {
    return this.client.put("/api/containers/{id}/network", {
      pathParams: { id: identifier },
      body,
    });
  }

  public networkSetup(identifier: string) {
    return this.client.post("/api/containers/{id}/network/setup", {
      pathParams: { id: identifier },
    });
  }

  public egress(identifier: string) {
    return this.client.get("/api/containers/{id}/egress", {
      pathParams: { id: identifier },
    });
  }

  public byName(name: string) {
    return this.client.get("/api/containers/by-name/{name}", {
      pathParams: { name },
    });
  }

  public injectRoute(identifier: string, body: { destination: string }) {
    return this.client.post("/api/containers/{id}/routes", {
      pathParams: { id: identifier },
      body,
    });
  }

  public removeRoute(identifier: string, body: { destination: string }) {
    return this.client.delete("/api/containers/{id}/routes", {
      pathParams: { id: identifier },
      body,
    });
  }

  public guiUrl(identifier: string) {
    return this.client.raw<{ gui_url: string }>("get", "/api/containers/{id}/gui-url", {
      pathParams: { id: identifier },
    });
  }

  public snapshot(identifier: string, body: ContainerSnapshotRequest) {
    return this.client.post("/api/containers/{id}/snapshot", {
      pathParams: { id: identifier },
      body,
    });
  }

  public cleanupTasks(identifier: string) {
    return this.client.raw<Record<string, unknown>>("get", "/api/containers/{id}/cleanup/tasks", {
      pathParams: { id: identifier },
    });
  }

  public cleanupForce(identifier: string, removeVolumes = false) {
    return this.client.raw<Record<string, unknown>>("post", "/api/containers/{id}/cleanup/force", {
      pathParams: { id: identifier },
      body: { confirm: true, remove_volumes: removeVolumes },
    });
  }
}
