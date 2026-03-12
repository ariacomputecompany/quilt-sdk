import type { QuiltClient } from "../core/client";

export class MasterModule {
  public constructor(private readonly client: QuiltClient) {}

  public get() {
    return this.client.get("/api/master-container");
  }

  public start() {
    return this.client.post("/api/master-container/start");
  }

  public stop() {
    return this.client.post("/api/master-container/stop");
  }

  public restart() {
    return this.client.post("/api/master-container/restart");
  }
}
