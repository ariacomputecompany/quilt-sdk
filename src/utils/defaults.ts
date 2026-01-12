/**
 * Default configuration values for Quilt SDK
 *
 * These defaults are optimized for agent use cases where:
 * - Containers run asynchronously (non-blocking)
 * - Maximum isolation is preferred
 * - Output capture is standard
 */

import { QuiltClientOptions } from '../types';

/**
 * Default container creation options
 *
 * Key design decisions:
 * - image_path: Internal default image (agents don't need to specify)
 * - async_mode: true (agents can kill containers at any time)
 * - All namespaces enabled for maximum isolation
 */
export const CONTAINER_DEFAULTS = {
  image_path: '/var/lib/quilt/images/default.tar',
  async_mode: true,
  enable_pid_namespace: true,
  enable_mount_namespace: true,
  enable_uts_namespace: true,
  enable_ipc_namespace: true,
  enable_network_namespace: true,
  // memory_limit_mb: omitted - proto3 default is 0 (no limit)
  // cpu_limit_percent: omitted - proto3 default is 0.0 (no limit)
  setup_commands: [] as string[],      // Empty array for proper proto encoding
  environment: {} as Record<string, string>,         // Empty map for proper proto encoding
  working_directory: '',   // Empty string default
};

/**
 * Default container exec options
 *
 * - Output capture enabled by default for command results
 * - Working directory defaults to container root
 */
export const EXEC_DEFAULTS = {
  capture_output: true,
  working_directory: '/',
};

/**
 * Default container stop options
 *
 * - 10 second grace period before force kill
 */
export const STOP_DEFAULTS = {
  timeout_seconds: 10,
};

/**
 * Default volume creation options
 *
 * - Local driver (standard filesystem volumes)
 */
export const VOLUME_DEFAULTS = {
  driver: 'local',
};

/**
 * Default metrics request options
 *
 * - Include system metrics by default
 */
export const METRICS_DEFAULTS = {
  include_system: true,
};

/**
 * Default client initialization options
 *
 * - HTTP API endpoint
 * - Reasonable timeout values
 */
export const CLIENT_DEFAULTS = {
  apiBaseUrl: 'http://localhost:8080',
  timeout: 30000,
};

// ============================================================================
// SERVERLESS FUNCTION DEFAULTS
// ============================================================================

/**
 * Default function creation options
 *
 * Key design decisions:
 * - timeout_seconds: 300 (5 min - reasonable for most functions)
 * - memory_limit_mb: 128 (minimal footprint)
 */
export const FUNCTION_DEFAULTS = {
  timeout_seconds: 300,
  memory_limit_mb: 128,
};

/**
 * Default function invoke options
 *
 * - Synchronous invocation for immediate response
 * - Timeout matches function default
 */
export const INVOKE_DEFAULTS = {
  async_mode: false,
  timeout_seconds: 300,
};

/**
 * Default deploy options
 *
 * - pool_size: 1 (at least one warm container)
 */
export const DEPLOY_DEFAULTS = {
  pool_size: 1,
};

/**
 * Default pause options
 *
 * - drain_timeout_seconds: 30 (wait for in-flight requests)
 */
export const PAUSE_DEFAULTS = {
  drain_timeout_seconds: 30,
};

/**
 * Default resume options
 *
 * - pool_size: 1 (at least one warm container)
 */
export const RESUME_DEFAULTS = {
  pool_size: 1,
};
