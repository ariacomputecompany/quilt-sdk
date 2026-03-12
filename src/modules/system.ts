import type { QuiltClient } from "../core/client";

export class SystemModule {
  public constructor(private readonly client: QuiltClient) {}

  public health() {
    return this.client.get("/health");
  }

  public info() {
    return this.client.get("/api/system/info");
  }

  public stats() {
    return this.client.get("/api/stats");
  }

  public activity(query?: { limit?: number }) {
    return this.client.get("/api/activity", { query });
  }

  public chartData(query?: {
    period?: "hour" | "day" | "week" | "month";
  }) {
    return this.client.get("/api/chart-data", { query });
  }
}
