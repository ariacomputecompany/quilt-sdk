/**
 * HTTP client for Quilt API
 *
 * Provides a low-level HTTP client for making requests to the Quilt HTTP API
 */

/**
 * HTTP error response from the API
 */
export interface ApiErrorResponse {
  error: string;
  details?: string;
}

/**
 * HTTP client error
 */
export class QuiltHttpError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly method: string,
    public readonly path: string,
    public readonly details?: string
  ) {
    super(message);
    this.name = 'QuiltHttpError';
  }
}

/**
 * Options for the HTTP client
 */
export interface HttpClientOptions {
  /**
   * Base URL for the API (e.g., "http://localhost:8080")
   */
  baseUrl: string;

  /**
   * Timeout for HTTP requests in milliseconds (default: 30000)
   */
  timeout?: number;

  /**
   * Bearer token for authentication (optional)
   */
  token?: string;
}

/**
 * HTTP client for making requests to the Quilt API
 */
export class HttpClient {
  private baseUrl: string;
  private timeout: number;
  private token?: string;

  constructor(options: HttpClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, ''); // Remove trailing slash
    this.timeout = options.timeout ?? 30000;
    this.token = options.token;
  }

  /**
   * Make an HTTP request
   */
  private async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    body?: any
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Handle 204 No Content
      if (response.status === 204) {
        return undefined as T;
      }

      // Parse response body
      const responseText = await response.text();
      let responseData: any;

      try {
        responseData = responseText ? JSON.parse(responseText) : {};
      } catch (e) {
        // If JSON parsing fails, treat as plain text
        responseData = { message: responseText };
      }

      // Handle errors
      if (!response.ok) {
        const errorData = responseData as ApiErrorResponse;
        throw new QuiltHttpError(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`,
          response.status,
          method,
          path,
          errorData.details
        );
      }

      return responseData as T;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof QuiltHttpError) {
        throw error;
      }

      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new QuiltHttpError(
            `Request timeout after ${this.timeout}ms`,
            408,
            method,
            path
          );
        }

        throw new QuiltHttpError(
          `Request failed: ${error.message}`,
          0,
          method,
          path
        );
      }

      throw error;
    }
  }

  /**
   * Make a GET request
   */
  async get<T>(path: string): Promise<T> {
    return this.request<T>('GET', path);
  }

  /**
   * Make a POST request
   */
  async post<T>(path: string, body?: any): Promise<T> {
    return this.request<T>('POST', path, body);
  }

  /**
   * Make a PUT request
   */
  async put<T>(path: string, body?: any): Promise<T> {
    return this.request<T>('PUT', path, body);
  }

  /**
   * Make a DELETE request
   */
  async delete<T>(path: string): Promise<T> {
    return this.request<T>('DELETE', path);
  }

  /**
   * Update the bearer token
   */
  setToken(token: string | undefined) {
    this.token = token;
  }

  /**
   * Get the current base URL
   */
  getBaseUrl(): string {
    return this.baseUrl;
  }
}
