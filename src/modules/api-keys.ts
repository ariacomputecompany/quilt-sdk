import type { QuiltClient } from "../core/client";

export class ApiKeysModule {
  public constructor(private readonly client: QuiltClient) {}

  public list() {
    return this.client.get("/api/api-keys");
  }

  public create(body: { name: string }) {
    return this.client.post("/api/api-keys", { body });
  }

  public delete(id: string) {
    return this.client.delete("/api/api-keys/{id}", { pathParams: { id } });
  }
}
