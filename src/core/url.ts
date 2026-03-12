const PATH_TOKEN_REGEX = /\{([^}]+)\}/g;

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
}

function normalizePath(path: string): string {
  return path.startsWith("/") ? path : `/${path}`;
}

export function buildUrl(params: {
  baseUrl: string;
  path: string;
  pathParams?: Record<string, unknown>;
  query?: Record<string, unknown>;
}): URL {
  const url = new URL(
    normalizePath(applyPathParams(params.path, params.pathParams ?? {})),
    normalizeBaseUrl(params.baseUrl),
  );

  appendQueryParams(url, params.query ?? {});
  return url;
}

export function applyPathParams(pathTemplate: string, pathParams: Record<string, unknown>): string {
  return pathTemplate.replace(PATH_TOKEN_REGEX, (_match, rawKey: string) => {
    const value = pathParams[rawKey];
    if (value === undefined || value === null) {
      throw new Error(`Missing required path param: ${rawKey}`);
    }
    return encodeURIComponent(String(value));
  });
}

export function appendQueryParams(url: URL, query: Record<string, unknown>): void {
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (Array.isArray(value)) {
      for (const item of value) {
        if (item === undefined || item === null) {
          continue;
        }
        url.searchParams.append(key, encodeQueryValue(item));
      }
      continue;
    }

    url.searchParams.set(key, encodeQueryValue(value));
  }
}

function encodeQueryValue(value: unknown): string {
  switch (typeof value) {
    case "string":
      return value;
    case "number":
    case "boolean":
    case "bigint":
      return String(value);
    default:
      return JSON.stringify(value);
  }
}
