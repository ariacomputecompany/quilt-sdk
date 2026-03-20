import type { QuiltClient } from "../core/client";

export class ContainersModule {
  public constructor(private readonly client: QuiltClient) {}

  public list(query?: { state?: string }) {
    return this.client.get("/api/containers", { query });
  }

  public create(
    body: {
      name?: string | null;
      image?: string | null;
      oci?: boolean | null;
      command?: string[] | null;
      environment?: Record<string, string> | null;
      memory_limit_mb?: number | null;
      cpu_limit_percent?: number | null;
      volumes?: string[] | null;
      working_directory?: string | null;
      strict?: boolean | null;
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
        image?: string | null;
        oci?: boolean | null;
        command?: string[] | null;
        environment?: Record<string, string> | null;
        memory_limit_mb?: number | null;
        cpu_limit_percent?: number | null;
        volumes?: string[] | null;
        working_directory?: string | null;
        strict?: boolean | null;
      }>;
    },
    execution: "sync" | "async" = "sync",
  ) {
    return this.client.post("/api/containers/batch", {
      query: { execution },
      body,
    });
  }

  public get(identifier: string) {
    return this.client.get("/api/containers/{id}", { pathParams: { id: identifier } });
  }

  public remove(identifier: string, execution: "sync" | "async" = "sync") {
    return this.client.delete("/api/containers/{id}", {
      pathParams: { id: identifier },
      query: { execution },
    });
  }

  public start(identifier: string) {
    return this.client.post("/api/containers/{id}/start", { pathParams: { id: identifier } });
  }

  public stop(identifier: string, execution: "sync" | "async" = "sync") {
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
    return this.client.raw<Record<string, unknown>>("get", "/api/containers/{id}/ready", {
      pathParams: { id: identifier },
    });
  }

  public networkDiagnostics(identifier: string) {
    return this.client.get("/api/containers/{id}/network/diagnostics", {
      pathParams: { id: identifier },
    });
  }

  public networkGet(identifier: string) {
    return this.client.raw<Record<string, unknown>>("get", "/api/containers/{id}/network", {
      pathParams: { id: identifier },
    });
  }

  public networkSet(identifier: string, body: { ip_address?: string; gateway?: string }) {
    return this.client.raw<Record<string, unknown>>("put", "/api/containers/{id}/network", {
      pathParams: { id: identifier },
      body,
    });
  }

  public networkSetup(identifier: string) {
    return this.client.raw<Record<string, unknown>>("post", "/api/containers/{id}/network/setup", {
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
    return this.client.raw<Record<string, unknown>>("delete", "/api/containers/{id}/routes", {
      pathParams: { id: identifier },
      body,
    });
  }

  public guiUrl(identifier: string) {
    return this.client.raw<{ gui_url: string }>("get", "/api/containers/{id}/gui-url", {
      pathParams: { id: identifier },
    });
  }

  public snapshot(identifier: string, body?: Record<string, unknown>) {
    return this.client.raw<Record<string, unknown>>("post", "/api/containers/{id}/snapshot", {
      pathParams: { id: identifier },
      body: body ?? {},
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
