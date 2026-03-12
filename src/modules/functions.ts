import type { QuiltClient } from "../core/client";

export class FunctionsModule {
  public constructor(private readonly client: QuiltClient) {}

  public list() {
    return this.client.get("/api/functions");
  }

  public create(body: Record<string, unknown>) {
    return this.client.post("/api/functions", { body });
  }

  public get(id: string) {
    return this.client.get("/api/functions/{id}", { pathParams: { id } });
  }

  public update(id: string, body: Record<string, unknown>) {
    return this.client.put("/api/functions/{id}", {
      pathParams: { id },
      body,
    });
  }

  public delete(id: string) {
    return this.client.delete("/api/functions/{id}", { pathParams: { id } });
  }

  public byName(name: string) {
    return this.client.get("/api/functions/by-name/{name}", {
      pathParams: { name },
    });
  }

  public deploy(id: string) {
    return this.client.post("/api/functions/{id}/deploy", {
      pathParams: { id },
    });
  }

  public pause(id: string) {
    return this.client.post("/api/functions/{id}/pause", {
      pathParams: { id },
    });
  }

  public resume(id: string) {
    return this.client.post("/api/functions/{id}/resume", {
      pathParams: { id },
    });
  }

  public invoke(id: string, body: Record<string, unknown> = {}) {
    return this.client.post("/api/functions/{id}/invoke", {
      pathParams: { id },
      body,
    });
  }

  public invokeByName(name: string, body: Record<string, unknown> = {}) {
    return this.client.post("/api/functions/invoke/{name}", {
      pathParams: { name },
      body,
    });
  }

  public listInvocations(id: string, query?: { limit?: number }) {
    return this.client.get("/api/functions/{id}/invocations", {
      pathParams: { id },
      query,
    });
  }

  public getInvocation(functionId: string, invocationId: string) {
    return this.client.get("/api/functions/{function_id}/invocations/{invocation_id}", {
      pathParams: {
        function_id: functionId,
        invocation_id: invocationId,
      },
    });
  }

  public listVersions(id: string) {
    return this.client.get("/api/functions/{id}/versions", {
      pathParams: { id },
    });
  }

  public rollback(id: string, body: { version: number }) {
    return this.client.post("/api/functions/{id}/rollback", {
      pathParams: { id },
      body,
    });
  }

  public pool(id: string) {
    return this.client.get("/api/functions/{id}/pool", {
      pathParams: { id },
    });
  }

  public poolStats() {
    return this.client.get("/api/functions/pool/stats");
  }
}
