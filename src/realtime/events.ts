import type { QuiltClient } from "../core/client";
import { buildUrl } from "../core/url";
import type { EventSourceLike } from "../types/common";

export type QuiltEventType =
  | "container_update"
  | "project_update"
  | "stats_update"
  | "activity_new"
  | "notification_new"
  | "system_metrics_update"
  | "process_monitor_update"
  | "network_allocation_update"
  | "dns_entry_update"
  | "cleanup_update"
  | "user_signup"
  | "user_update"
  | "user_activity"
  | "heartbeat";

export interface QuiltSseEvent<T = unknown> {
  type: QuiltEventType | string;
  data: T;
}

export class EventsClient {
  public constructor(private readonly client: QuiltClient) {}

  public openEventSource(): EventSourceLike {
    const token = this.client.getQueryToken();
    if (token === null) {
      throw new Error("SSE requires token or API key auth");
    }

    const url = buildUrl({
      baseUrl: this.client.getBaseUrl(),
      path: "/api/events",
      query: { token },
    });

    const EventSourceImpl =
      this.client.getEventSourceImpl() ??
      (typeof globalThis.EventSource === "function" ? globalThis.EventSource : null);
    if (EventSourceImpl === null) {
      throw new Error("No EventSource implementation configured");
    }

    return new EventSourceImpl(url.toString());
  }

  public on(
    eventSource: EventSourceLike,
    eventType: QuiltEventType,
    handler: (event: QuiltSseEvent) => void,
  ): void {
    eventSource.addEventListener(eventType, (event) => {
      const parsed = safeParseJson((event as MessageEvent<string>).data);
      handler({
        type: eventType,
        data: parsed,
      });
    });
  }
}

function safeParseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return value;
  }
}
