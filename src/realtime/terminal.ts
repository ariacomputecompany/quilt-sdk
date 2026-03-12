import type { QuiltClient } from "../core/client";
import { buildUrl } from "../core/url";

export interface TerminalAttachOptions {
  session_id?: string;
  container_id?: string;
  cols?: number;
  rows?: number;
  shell?: string;
}

export type TerminalClientMessage =
  | { type: "resize"; cols: number; rows: number }
  | { type: "ping"; ts: number }
  | { type: "signal"; signal: "SIGINT" | "SIGTERM" | "SIGHUP" };

export type TerminalServerMessage =
  | { type: "ready"; session_id: string; shell?: string; pid?: number }
  | { type: "error"; code: string; message?: string }
  | { type: "pong"; ts?: number }
  | { type: "exit"; code?: number; signal?: string | null }
  | { type: "output"; data?: string };

export class TerminalRealtimeClient {
  public constructor(private readonly client: QuiltClient) {}

  public buildAttachUrl(options: TerminalAttachOptions = {}): string {
    const token = this.client.getQueryToken();
    if (token === null) {
      throw new Error("WebSocket terminal attach requires token or API key auth");
    }

    const url = buildUrl({
      baseUrl: httpToWsBaseUrl(this.client.getBaseUrl()),
      path: "/ws/terminal/attach",
      query: {
        token,
        ...options,
      },
    });

    return url.toString();
  }

  public connect(
    options: TerminalAttachOptions = {},
    protocols: string | string[] = ["terminal"],
  ): WebSocket {
    const url = this.buildAttachUrl(options);
    return new WebSocket(url, protocols);
  }

  public sendControlMessage(socket: WebSocket, message: TerminalClientMessage): void {
    socket.send(JSON.stringify(message));
  }

  public parseServerMessage(payload: string): TerminalServerMessage | null {
    try {
      return JSON.parse(payload) as TerminalServerMessage;
    } catch {
      return null;
    }
  }
}

function httpToWsBaseUrl(baseUrl: string): string {
  if (baseUrl.startsWith("https://")) {
    return `wss://${baseUrl.slice("https://".length)}`;
  }

  if (baseUrl.startsWith("http://")) {
    return `ws://${baseUrl.slice("http://".length)}`;
  }

  return baseUrl;
}
