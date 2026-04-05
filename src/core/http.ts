import type { FetchFn, QuiltAuth } from "../types/common";
import type {
  HttpMethod,
  StablePathForMethod,
  StableRequestOptions,
  SuccessResponse,
} from "../types/surface";
import { QuiltApiError } from "./errors";
import { buildUrl } from "./url";

export interface QuiltTransportOptions {
  baseUrl: string;
  auth: QuiltAuth;
  timeoutMs: number;
  defaultHeaders: Record<string, string>;
  fetchImpl: FetchFn;
}

export interface RawRequestOptions {
  pathParams?: Record<string, unknown> | undefined;
  query?: Record<string, unknown> | undefined;
  headers?: Record<string, string> | undefined;
  body?: unknown;
  signal?: AbortSignal | undefined;
  authInQuery?: boolean | undefined;
}

export class QuiltTransport {
  private readonly baseUrl: string;
  private readonly auth: QuiltAuth;
  private readonly timeoutMs: number;
  private readonly defaultHeaders: Record<string, string>;
  private readonly fetchImpl: FetchFn;

  public constructor(options: QuiltTransportOptions) {
    this.baseUrl = options.baseUrl;
    this.auth = options.auth;
    this.timeoutMs = options.timeoutMs;
    this.defaultHeaders = options.defaultHeaders;
    this.fetchImpl = options.fetchImpl;
  }

  public getAuth(): QuiltAuth {
    return this.auth;
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  public getQueryToken(): string | null {
    const query = this.authQueryParam();
    return query["token"] ?? null;
  }

  public async request<M extends HttpMethod, P extends StablePathForMethod<M>>(
    method: M,
    path: P,
    options?: StableRequestOptions<P, M>,
  ): Promise<SuccessResponse<P, M>> {
    const response = await this.requestResponse(
      method,
      path,
      options as RawRequestOptions | undefined,
    );
    return await parseResponse<SuccessResponse<P, M>>(response);
  }

  public async requestRaw<TResponse>(
    method: string,
    path: string,
    options?: RawRequestOptions,
  ): Promise<TResponse> {
    const response = await this.requestResponse(method, path, options);
    return await parseResponse<TResponse>(response);
  }

  public async requestResponse(
    method: string,
    path: string,
    options?: RawRequestOptions,
  ): Promise<Response> {
    const query = {
      ...(options?.query ?? {}),
      ...(options?.authInQuery ? this.authQueryParam() : {}),
    };

    const url = buildUrl(
      options?.pathParams === undefined
        ? {
            baseUrl: this.baseUrl,
            path,
            query,
          }
        : {
            baseUrl: this.baseUrl,
            path,
            pathParams: options.pathParams,
            query,
          },
    );

    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...this.authHeader(),
      ...(options?.headers ?? {}),
    };

    const body = options?.body;
    const bodyInit = this.serializeBody(body, headers);

    const timeoutController = new AbortController();
    const signal = mergeAbortSignals(options?.signal, timeoutController.signal);
    const timeout = setTimeout(() => timeoutController.abort(), this.timeoutMs);

    try {
      const init: RequestInit = {
        method: method.toUpperCase(),
        headers,
        signal,
      };
      if (bodyInit !== undefined) {
        init.body = bodyInit;
      }
      const response = await this.fetchImpl(url, init);
      if (!response.ok) {
        await throwApiError(response);
      }
      return response;
    } finally {
      clearTimeout(timeout);
    }
  }

  private authHeader(): Record<string, string> {
    switch (this.auth.type) {
      case "none":
      case "queryToken":
        return {};
      case "bearer":
        return { Authorization: `Bearer ${this.auth.token}` };
      case "apiKey":
        return { "X-Api-Key": this.auth.apiKey };
      default:
        return {};
    }
  }

  private authQueryParam(): Record<string, string> {
    switch (this.auth.type) {
      case "none":
        return {};
      case "queryToken":
      case "bearer":
        return { token: this.auth.token };
      case "apiKey":
        return { token: this.auth.apiKey };
      default:
        return {};
    }
  }

  private serializeBody(body: unknown, headers: Record<string, string>): BodyInit | undefined {
    if (body === undefined) {
      return undefined;
    }

    if (
      body instanceof FormData ||
      body instanceof URLSearchParams ||
      body instanceof Blob ||
      typeof body === "string" ||
      body instanceof ArrayBuffer ||
      ArrayBuffer.isView(body)
    ) {
      return body as BodyInit;
    }

    if (!hasContentType(headers)) {
      headers["Content-Type"] = "application/json";
    }

    return JSON.stringify(body);
  }
}

async function parseResponse<TResponse>(response: Response): Promise<TResponse> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const isJson = contentType.includes("application/json");
  const isText =
    contentType.includes("text/plain") ||
    contentType.includes("application/x-ndjson") ||
    contentType.includes("text/event-stream") ||
    contentType.startsWith("text/");

  if (!response.ok) {
    const errorBody = isJson
      ? ((await response.json()) as unknown)
      : isText
        ? ((await response.text()) as unknown)
        : null;

    throw new QuiltApiError({
      message: `HTTP ${response.status} ${response.statusText}`,
      status: response.status,
      body: errorBody,
    });
  }

  if (response.status === 204 || response.status === 205) {
    return undefined as TResponse;
  }

  if (isJson) {
    return (await response.json()) as TResponse;
  }

  if (isText) {
    return (await response.text()) as TResponse;
  }

  if (response.body === null) {
    return undefined as TResponse;
  }

  return (await response.arrayBuffer()) as TResponse;
}

async function throwApiError(response: Response): Promise<never> {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const isJson = contentType.includes("application/json");
  const isText =
    contentType.includes("text/plain") ||
    contentType.includes("text/event-stream") ||
    contentType.includes("application/x-ndjson") ||
    contentType.startsWith("text/");

  const errorBody = isJson
    ? ((await response.json()) as unknown)
    : isText
      ? ((await response.text()) as unknown)
      : null;

  throw new QuiltApiError({
    message: `HTTP ${response.status} ${response.statusText}`,
    status: response.status,
    body: errorBody,
  });
}

function hasContentType(headers: Record<string, string>): boolean {
  for (const key of Object.keys(headers)) {
    if (key.toLowerCase() === "content-type") {
      return true;
    }
  }
  return false;
}

function mergeAbortSignals(primary: AbortSignal | undefined, fallback: AbortSignal): AbortSignal {
  if (primary === undefined) {
    return fallback;
  }

  const controller = new AbortController();

  const onAbort = () => {
    controller.abort();
  };

  if (primary.aborted || fallback.aborted) {
    controller.abort();
  } else {
    primary.addEventListener("abort", onAbort, { once: true });
    fallback.addEventListener("abort", onAbort, { once: true });
  }

  return controller.signal;
}
