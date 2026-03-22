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
  eventSource?: EventSourceConstructorLike;
  webSocket?: WebSocketConstructorLike;
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

export interface EventSourceLike {
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void;
  close(): void;
  onerror:
    | ((this: EventSourceLike, ev: Event) => unknown)
    | ((this: EventSource, ev: Event) => unknown)
    | null;
}

export interface EventSourceConstructorLike {
  new (url: string | URL, eventSourceInitDict?: EventSourceInit): EventSourceLike;
}

export interface WebSocketLike {
  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void;
}

export interface WebSocketConstructorLike {
  new (url: string | URL, protocols?: string | string[]): WebSocketLike;
}
