import type { QuiltErrorBody } from "../types/common";

export class QuiltApiError extends Error {
  public readonly status: number;
  public readonly requestId: string | null;
  public readonly errorCode: string | null;
  public readonly retryAfter: number | null;
  public readonly hint: string | null;
  public readonly details: QuiltErrorBody["details"];
  public readonly body: unknown;

  public constructor(params: {
    message: string;
    status: number;
    body: unknown;
  }) {
    super(params.message);
    this.name = "QuiltApiError";
    this.status = params.status;
    this.body = params.body;

    const parsedBody = asQuiltErrorBody(params.body);
    this.requestId = parsedBody?.request_id ?? null;
    this.errorCode = parsedBody?.error_code ?? null;
    this.retryAfter = parsedBody?.retry_after ?? null;
    this.hint = parsedBody?.hint ?? null;
    this.details = parsedBody?.details ?? null;
  }
}

function asQuiltErrorBody(value: unknown): QuiltErrorBody | null {
  if (value === null || typeof value !== "object") {
    return null;
  }

  const obj = value as Record<string, unknown>;
  if (
    typeof obj["error"] === "string" &&
    typeof obj["error_code"] === "string" &&
    typeof obj["request_id"] === "string"
  ) {
    return {
      error: obj["error"],
      error_code: obj["error_code"],
      request_id: obj["request_id"],
      details:
        obj["details"] && typeof obj["details"] === "object"
          ? ((obj["details"] as QuiltErrorBody["details"]) ?? null)
          : null,
      retry_after: typeof obj["retry_after"] === "number" ? obj["retry_after"] : null,
      hint: typeof obj["hint"] === "string" ? obj["hint"] : null,
    };
  }

  return null;
}
