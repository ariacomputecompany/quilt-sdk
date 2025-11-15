/**
 * Property normalization utilities
 *
 * Converts short/camelCase property names to canonical snake_case names
 * used by the underlying gRPC API while maintaining full type safety.
 */

/**
 * Property alias mapping from short/camelCase → snake_case
 */
const PROPERTY_MAP: Record<string, string> = {
  // Container properties
  image: 'image_path',
  cmd: 'command',
  env: 'environment',
  workdir: 'working_directory',
  memory: 'memory_limit_mb',
  cpu: 'cpu_limit_percent',

  // Identifier aliases
  id: 'container_id',

  // Mount aliases
  src: 'source',
  dst: 'target',
  dest: 'target',
  ro: 'readonly',

  // Network aliases
  ip: 'ip_address',
  bridge: 'bridge_interface',

  // Common aliases
  timeout: 'timeout_seconds',
  capture: 'capture_output',
  include: 'include_system',

  // CamelCase to snake_case
  imagePath: 'image_path',
  workingDirectory: 'working_directory',
  setupCommands: 'setup_commands',
  memoryLimitMb: 'memory_limit_mb',
  cpuLimitPercent: 'cpu_limit_percent',
  enablePidNamespace: 'enable_pid_namespace',
  enableMountNamespace: 'enable_mount_namespace',
  enableUtsNamespace: 'enable_uts_namespace',
  enableIpcNamespace: 'enable_ipc_namespace',
  enableNetworkNamespace: 'enable_network_namespace',
  asyncMode: 'async_mode',
  containerId: 'container_id',
  containerName: 'container_name',
  timeoutSeconds: 'timeout_seconds',
  captureOutput: 'capture_output',
  copyScript: 'copy_script',
  exitCode: 'exit_code',
  errorMessage: 'error_message',
  mountPoint: 'mount_point',
  createdAt: 'created_at',
  startedAt: 'started_at',
  exitedAt: 'exited_at',
  ipAddress: 'ip_address',
  bridgeInterface: 'bridge_interface',
  vethHost: 'veth_host',
  vethContainer: 'veth_container',
  setupCompleted: 'setup_completed',
  includeSystem: 'include_system',
  startTime: 'start_time',
  endTime: 'end_time',
  intervalSeconds: 'interval_seconds',
  taskId: 'task_id',
  resourceType: 'resource_type',
  resourcePath: 'resource_path',
  completedAt: 'completed_at',
  memoryUsageBytes: 'memory_usage_bytes',
  rootfsPath: 'rootfs_path',
  uptimeSeconds: 'uptime_seconds',
  containersRunning: 'containers_running',
  containersTotal: 'containers_total',
  containersStopped: 'containers_stopped',
  memoryUsedMb: 'memory_used_mb',
  memoryTotalMb: 'memory_total_mb',
  cpuCount: 'cpu_count',
  loadAverage: 'load_average',
  containerMetrics: 'container_metrics',
  systemMetrics: 'system_metrics',
  networkConfig: 'network_config',
  eventType: 'event_type',
  eventTypes: 'event_types',
  containerIds: 'container_ids',
  allocationTime: 'allocation_time',
  cleanedResources: 'cleaned_resources',
};

/**
 * Checks if a value is a plain object
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === '[object Object]'
  );
}

/**
 * Normalizes property names in an object, converting aliases to canonical names
 */
function normalizeObject(obj: Record<string, unknown>): Record<string, unknown> {
  const normalized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    // Get canonical property name (or keep original if no mapping exists)
    const canonicalKey = PROPERTY_MAP[key] || key;

    // Recursively normalize nested objects
    if (isPlainObject(value)) {
      normalized[canonicalKey] = normalizeObject(value as Record<string, unknown>);
    }
    // Recursively normalize arrays
    else if (Array.isArray(value)) {
      normalized[canonicalKey] = value.map(item =>
        isPlainObject(item) ? normalizeObject(item as Record<string, unknown>) : item
      );
    }
    // Primitive values pass through
    else {
      normalized[canonicalKey] = value;
    }
  }

  return normalized;
}

/**
 * Type-safe normalization function
 *
 * Accepts input with short/camelCase property names and returns
 * an object with canonical snake_case property names.
 *
 * @example
 * ```ts
 * const input = { image: '/path/to/image.tar', cmd: ['node', 'app.js'] };
 * const output = normalize<CreateContainerRequest>(input);
 * // output = { image_path: '/path/to/image.tar', command: ['node', 'app.js'] }
 * ```
 */
export function normalize<T>(input: Record<string, unknown>): T {
  return normalizeObject(input) as T;
}
