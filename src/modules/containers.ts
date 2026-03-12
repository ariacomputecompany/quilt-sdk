import type { QuiltClient } from "../core/client";

export class ContainersModule {
  public constructor(private readonly client: QuiltClient) {}

  public list(query?: { state?: string }) {
    return this.client.get("/api/containers", { query });
  }

  public create(
    body: {
      name?: string | null;
      image?: "prod" | "prod-gui" | null;
      command?: string[] | null;
      environment?: Record<string, string> | null;
      memory_limit_mb?: number | null;
      cpu_limit_percent?: number | null;
      volumes?: string[] | null;
      working_directory?: string | null;
    },
    execution: "sync" | "async" = "sync",
  ) {
    return this.client.post("/api/containers", {
      query: { execution },
      body,
    });
  }

  public createBatch(
    body: {
      items: Array<{
        name?: string | null;
        image?: "prod" | "prod-gui" | null;
        command?: string[] | null;
        environment?: Record<string, string> | null;
        memory_limit_mb?: number | null;
        cpu_limit_percent?: number | null;
        volumes?: string[] | null;
        working_directory?: string | null;
      }>;
    },
    execution: "sync" | "async" = "sync",
  ) {
    return this.client.post("/api/containers/batch", {
      query: { execution },
      body,
    });
  }

  public get(id: string) {
    return this.client.get("/api/containers/{id}", { pathParams: { id } });
  }

  public remove(id: string, execution: "sync" | "async" = "sync") {
    return this.client.delete("/api/containers/{id}", {
      pathParams: { id },
      query: { execution },
    });
  }

  public start(id: string) {
    return this.client.post("/api/containers/{id}/start", { pathParams: { id } });
  }

  public stop(id: string, execution: "sync" | "async" = "sync") {
    return this.client.post("/api/containers/{id}/stop", {
      pathParams: { id },
      query: { execution },
    });
  }

  public kill(id: string) {
    return this.client.post("/api/containers/{id}/kill", { pathParams: { id } });
  }

  public exec(
    id: string,
    body: {
      command:
        | string
        | string[]
        | { cmd: string | string[] }
        | { cmd_b64: string }
        | { parts_b64: string[] };
      workdir?: string;
      capture_output?: boolean;
      timeout_ms?: number;
      detach?: boolean;
    },
  ) {
    return this.client.post("/api/containers/{id}/exec", {
      pathParams: { id },
      body,
    });
  }

  public logs(id: string, query?: { limit?: number }) {
    return this.client.get("/api/containers/{id}/logs", {
      pathParams: { id },
      query,
    });
  }

  public metrics(id: string) {
    return this.client.get("/api/containers/{id}/metrics", {
      pathParams: { id },
    });
  }

  public networkDiagnostics(id: string) {
    return this.client.get("/api/containers/{id}/network/diagnostics", {
      pathParams: { id },
    });
  }

  public egress(id: string) {
    return this.client.get("/api/containers/{id}/egress", {
      pathParams: { id },
    });
  }

  public byName(name: string) {
    return this.client.get("/api/containers/by-name/{name}", {
      pathParams: { name },
    });
  }

  public injectRoute(id: string, body: { destination: string; gateway: string }) {
    return this.client.post("/api/containers/{id}/routes", {
      pathParams: { id },
      body,
    });
  }

  public removeRoute(id: string, query: { destination: string; gateway?: string }) {
    return this.client.delete("/api/containers/{id}/routes", {
      pathParams: { id },
      query,
    });
  }
}
