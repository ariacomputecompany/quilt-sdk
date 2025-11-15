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
