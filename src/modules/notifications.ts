import type { QuiltClient } from "../core/client";

export class NotificationsModule {
  public constructor(private readonly client: QuiltClient) {}

  public list(query?: { limit?: number; unread_only?: boolean }) {
    return this.client.get("/api/notifications", { query });
  }

  public create(body: {
    type: string;
    title: string;
    message: string;
    severity?: "info" | "warning" | "error";
  }) {
    return this.client.post("/api/notifications", { body });
  }

  public markRead(id: string) {
    return this.client.put("/api/notifications/{id}/read", {
      pathParams: { id },
    });
  }

  public markAllRead() {
    return this.client.post("/api/notifications/mark-all-read");
  }
}
