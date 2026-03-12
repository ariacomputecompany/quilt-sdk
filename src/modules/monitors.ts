import type { QuiltClient } from "../core/client";

export class MonitorsModule {
  public constructor(private readonly client: QuiltClient) {}

  public list() {
    return this.client.get("/api/monitors");
  }

  public byContainer(containerId: string) {
    return this.client.get("/api/monitors/{container_id}", {
      pathParams: { container_id: containerId },
    });
  }
}
