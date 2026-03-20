import type { QuiltClient } from "../core/client";

export class VolumesModule {
  public constructor(private readonly client: QuiltClient) {}

  public list() {
    return this.client.get("/api/volumes");
  }

  public create(body: {
    name: string;
    driver?: string;
    labels?: Record<string, string>;
  }) {
    return this.client.post("/api/volumes", { body });
  }

  public get(name: string) {
    return this.client.get("/api/volumes/{name}", {
      pathParams: { name },
    });
  }

  public inspect(name: string) {
    return this.client.raw<Record<string, unknown>>("get", "/api/volumes/{name}/inspect", {
      pathParams: { name },
    });
  }

  public delete(name: string, execution: "sync" | "async" = "sync") {
    return this.client.delete("/api/volumes/{name}", {
      pathParams: { name },
      query: { execution },
    });
  }

  public listFiles(name: string, query?: { path?: string }) {
    return this.client.get("/api/volumes/{name}/ls", {
      pathParams: { name },
      query,
    });
  }

  public rename(name: string, newName: string) {
    return this.client.raw<Record<string, unknown>>("post", "/api/volumes/{name}/rename", {
      pathParams: { name },
      body: { new_name: newName },
    });
  }

  public deleteFile(name: string, path: string) {
    return this.client.raw<Record<string, unknown>>("delete", "/api/volumes/{name}/files/{path}", {
      pathParams: { name, path },
    });
  }
}
