import type { QuiltClient } from "../core/client";

export class TerminalModule {
  public constructor(private readonly client: QuiltClient) {}

  public listSessions(query?: { target?: "master" | "container" }) {
    return this.client.get("/api/terminal/sessions", { query });
  }

  public createSession(body: {
    target: "master" | "container";
    container_identifier?: string;
    shell?: string;
    cols?: number;
    rows?: number;
  }) {
    const { container_identifier, ...rest } = body;
    return this.client.post("/api/terminal/sessions", {
      body: {
        ...rest,
        ...(container_identifier !== undefined ? { container_id: container_identifier } : {}),
      },
    });
  }

  public getSession(sessionId: string) {
    return this.client.get("/api/terminal/sessions/{session_id}", {
      pathParams: { session_id: sessionId },
    });
  }

  public deleteSession(sessionId: string) {
    return this.client.delete("/api/terminal/sessions/{session_id}", {
      pathParams: { session_id: sessionId },
    });
  }

  public resizeSession(sessionId: string, body: { cols: number; rows: number }) {
    return this.client.post("/api/terminal/sessions/{session_id}/resize", {
      pathParams: { session_id: sessionId },
      body,
    });
  }
}
