/**
 * Type definitions for Quilt SDK
 */

/**
 * Options for creating a Quilt client
 */
export interface QuiltClientOptions {
  /**
   * API base URL (default: "http://localhost:8080")
   */
  apiBaseUrl?: string;

  /**
   * Bearer token for authentication (optional)
   * Use for JWT tokens
   */
  token?: string;

  /**
   * API key for authentication (optional)
   * Format: quilt_sk_<32-hex-chars>
   * Alias for token - if both are provided, apiKey takes precedence
   */
  apiKey?: string;

  /**
   * Timeout for HTTP requests in milliseconds (default: 30000)
   */
  timeout?: number;
}

/**
 * Error thrown when the Quilt API is not reachable
 */
export class QuiltConnectionError extends Error {
  constructor(message: string, public readonly apiBaseUrl: string) {
    super(message);
    this.name = 'QuiltConnectionError';
  }
}

/**
 * Error thrown when an API call fails
 */
export class QuiltApiError extends Error {
  constructor(
    message: string,
    public readonly method: string,
    public readonly statusCode: number,
    public readonly details?: string
  ) {
    super(message);
    this.name = 'QuiltApiError';
  }
}

/**
 * Container status enum values
 */
export enum ContainerStatusEnum {
  UNKNOWN = 0,
  CREATED = 1,
  STARTING = 2,
  RUNNING = 3,
  STOPPED = 4,
  FAILED = 5,
  REMOVING = 6,
}

/**
 * Mount type enum values
 */
export enum MountTypeEnum {
  BIND = 0,
  VOLUME = 1,
  TMPFS = 2,
}

/**
 * Event type enum values
 */
export enum EventTypeEnum {
  CONTAINER_STARTED = 0,
  CONTAINER_STOPPED = 1,
  CONTAINER_FAILED = 2,
  CONTAINER_REMOVED = 3,
  VOLUME_CREATED = 4,
  VOLUME_REMOVED = 5,
  CLEANUP_STARTED = 6,
  CLEANUP_COMPLETED = 7,
}

// ============================================================================
// SERVERLESS FUNCTION TYPES
// ============================================================================

/**
 * Function state machine states
 * Matches backend: Pending -> Deploying -> Active -> Paused -> Error
 */
export enum FunctionState {
  PENDING = 'pending',
  DEPLOYING = 'deploying',
  ACTIVE = 'active',
  PAUSED = 'paused',
  ERROR = 'error',
}

/**
 * Function runtime types
 */
export enum FunctionRuntime {
  NODE_18 = 'node18',
  NODE_20 = 'node20',
  PYTHON_3_11 = 'python3.11',
  PYTHON_3_12 = 'python3.12',
  GO_1_21 = 'go1.21',
  RUST_1_75 = 'rust1.75',
}

/**
 * Pool container states
 */
export enum PoolContainerState {
  READY = 'ready',
  BUSY = 'busy',
  STALE = 'stale',
}

/**
 * Invocation states
 */
export enum InvocationState {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
}
