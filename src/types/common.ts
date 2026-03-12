export type QuiltAuth =
  | { type: "none" }
  | { type: "bearer"; token: string }
  | { type: "apiKey"; apiKey: string }
  | { type: "queryToken"; token: string };

export interface QuiltClientOptions {
  baseUrl?: string;
  auth?: QuiltAuth;
  token?: string;
  apiKey?: string;
  timeoutMs?: number;
  defaultHeaders?: Record<string, string>;
  fetch?: FetchFn;
}

export interface QuiltErrorBody {
  error: string;
  error_code: string;
  request_id: string;
  details?: {
    expected?: string[] | null;
    received?: string | null;
    example?: string | null;
    state?: string | null;
    exit_code?: number | null;
  } | null;
  retry_after?: number | null;
  hint?: string | null;
}

export interface OperationAcceptedResponse {
  success: boolean;
  operation_id: string;
  status_url: string;
}

export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | { [key: string]: JsonValue } | JsonValue[];

export type FetchFn = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
