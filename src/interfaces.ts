/**
 * Clean TypeScript interfaces for Quilt SDK
 *
 * These interfaces provide a type-safe, intuitive API surface
 * for the Quilt HTTP API
 */

// ============================================================================
// Enums
// ============================================================================

export enum ContainerStatus {
  PENDING = 0,
  RUNNING = 1,
  EXITED = 2,
  FAILED = 3,
}

export enum MountType {
  BIND = 0,
  VOLUME = 1,
  TMPFS = 2,
}

// ============================================================================
// Common Types
// ============================================================================

export interface Mount {
  source: string;
  target: string;
  type: MountType;
  readonly: boolean;
  options?: Record<string, string>;
}

export interface Volume {
  name: string;
  driver: string;
  mount_point: string;
  labels?: Record<string, string>;
  options?: Record<string, string>;
  created_at: number;
}

export interface LogEntry {
  timestamp: number;
  message: string;
}

export interface HealthCheck {
  name: string;
  healthy: boolean;
  message: string;
  duration_ms: number;
}

export interface ContainerMetric {
  container_id: string;
  timestamp: number;
  cpu_usage_usec: number;
  cpu_user_usec: number;
  cpu_system_usec: number;
  cpu_throttled_usec: number;
  memory_current_bytes: number;
  memory_peak_bytes: number;
  memory_limit_bytes: number;
  memory_cache_bytes: number;
  memory_rss_bytes: number;
  network_rx_bytes: number;
  network_tx_bytes: number;
  network_rx_packets: number;
  network_tx_packets: number;
  disk_read_bytes: number;
  disk_write_bytes: number;
}

export interface SystemMetrics {
  timestamp: number;
  memory_used_mb: number;
  memory_total_mb: number;
  cpu_count: number;
  load_average: number[];
  containers_total: number;
  containers_running: number;
  containers_stopped: number;
}

export interface ProcessMonitor {
  container_id: string;
  pid: number;
  status: string;
  started_at: number;
  last_check: number;
  check_count: number;
  error_message: string;
}

export interface CleanupTask {
  task_id: number;
  container_id: string;
  resource_type: string;
  resource_path: string;
  status: string;
  created_at: number;
  completed_at: number;
  error_message: string;
}

export interface NetworkAllocation {
  container_id: string;
  ip_address: string;
  bridge_interface: string;
  veth_host: string;
  veth_container: string;
  setup_completed: boolean;
  allocation_time: number;
  status: string;
}

export interface ContainerNetworkConfig {
  ip_address: string;
  bridge_interface: string;
  veth_host: string;
  veth_container: string;
  setup_completed: boolean;
  status: string;
}

export interface DnsEntry {
  container_id: string;
  container_name: string;
  ip_address: string;
}

export interface ContainerEvent {
  event_type: string;
  container_id: string;
  timestamp: number;
  attributes: Record<string, string>;
}

// ============================================================================
// Container Operations
// ============================================================================

export interface CreateContainerRequest {
  image_path: string;
  command?: string[];
  environment?: Record<string, string>;
  working_directory?: string;
  memory_limit_mb?: number;
  cpu_limit_percent?: number;
  name?: string;
  async_mode?: boolean;
  volumes?: string[];  // Format: "/host/path:/container/path" or "volume-name:/container/path"
}

export interface CreateContainerResponse {
  container_id: string;
  name?: string;
  ip_address?: string;
}

export interface GetContainerStatusRequest {
  container_id?: string;
  container_name?: string;
}

export interface GetContainerStatusResponse {
  container_id: string;
  status: ContainerStatus;
  exit_code: number;
  error_message: string;
  pid: number;
  created_at: number;
  started_at: number;
  exited_at: number;
  memory_usage_bytes: number;
  rootfs_path: string;
  ip_address: string;
}

export interface GetContainerLogsRequest {
  container_id?: string;
  container_name?: string;
}

export interface GetContainerLogsResponse {
  container_id: string;
  logs: LogEntry[];
}

export interface StopContainerRequest {
  container_id?: string;
  timeout_seconds?: number;
  container_name?: string;
}

export interface StopContainerResponse {
  success: boolean;
  error_message: string;
}

export interface RemoveContainerRequest {
  container_id?: string;
  force?: boolean;
  container_name?: string;
}

export interface RemoveContainerResponse {
  success: boolean;
  error_message: string;
}

/**
 * Structured command with base64 encoding support
 */
export interface StructuredCommand {
  /** Plain text command (string or array) */
  cmd?: string | string[];
  /** Single base64-encoded script (decoded and wrapped in sh -c) */
  cmd_b64?: string;
  /** Base64-encoded command parts (each decoded separately) */
  parts_b64?: string[];
}

/**
 * Command input - supports multiple formats:
 * - string: Simple command (wrapped in sh -c by backend)
 * - string[]: Command with arguments
 * - StructuredCommand: Base64-encoded commands for special characters
 */
export type CommandInput = string | string[] | StructuredCommand;

export interface ExecContainerRequest {
  container_id?: string;
  container_name?: string;
  /** Command to execute (string, array, or structured with base64) */
  command?: CommandInput;
  /** Convenience: multi-line script (auto-encoded to base64) */
  script?: string;
  working_directory?: string;
  environment?: Record<string, string>;
  capture_output?: boolean;
  copy_script?: boolean;
}

export interface ExecContainerResponse {
  success: boolean;
  exit_code: number;
  stdout: string;
  stderr: string;
  error_message: string;
}

export interface StartContainerRequest {
  container_id?: string;
  container_name?: string;
}

export interface StartContainerResponse {
  success: boolean;
  error_message: string;
  pid: number;
}

export interface KillContainerRequest {
  container_id?: string;
  container_name?: string;
}

export interface KillContainerResponse {
  success: boolean;
  error_message: string;
}

export interface GetContainerByNameRequest {
  name: string;
}

export interface GetContainerByNameResponse {
  container_id: string;
  found: boolean;
  error_message: string;
}

export interface ContainerInfo {
  container_id: string;
  tenant_id?: string;
  name?: string;
  state: string;  // "Pending" | "Running" | "Exited" | "Error" | "Starting"
  pid?: number;
  exit_code?: number;
  ip_address?: string;
  created_at?: number;
  started_at?: number;
  exited_at?: number;
  working_directory?: string;
}

export interface ListContainersResponse {
  containers: ContainerInfo[];
}

// ============================================================================
// Volume Management
// ============================================================================

export interface CreateVolumeRequest {
  name: string;
  driver?: string;
  labels?: Record<string, string>;
  options?: Record<string, string>;
}

export interface CreateVolumeResponse {
  success: boolean;
  error_message: string;
  volume: Volume;
}

export interface RemoveVolumeRequest {
  name: string;
  force?: boolean;
}

export interface RemoveVolumeResponse {
  success: boolean;
  error_message: string;
}

export interface ListVolumesRequest {
  filters?: Record<string, string>;
}

export interface ListVolumesResponse {
  volumes: Volume[];
}

export interface InspectVolumeRequest {
  name: string;
}

export interface InspectVolumeResponse {
  found: boolean;
  volume: Volume;
  error_message: string;
}

// ============================================================================
// Health and Monitoring
// ============================================================================

export interface GetHealthRequest {
  // Empty
}

export interface GetHealthResponse {
  healthy: boolean;
  status: string;
  uptime_seconds: number;
  containers_running: number;
  containers_total: number;
  checks: HealthCheck[];
}

export interface GetMetricsRequest {
  container_id?: string;
  include_system?: boolean;
  start_time?: number;
  end_time?: number;
  interval_seconds?: number;
}

export interface GetMetricsResponse {
  container_metrics: ContainerMetric[];
  system_metrics: SystemMetrics;
}

export interface GetSystemInfoRequest {
  // Empty
}

export interface GetSystemInfoResponse {
  version: string;
  runtime: string;
  start_time: number;
  features: Record<string, string>;
  limits: Record<string, string>;
}

export interface StreamEventsRequest {
  container_ids?: string[];
  event_types?: string[];
}

// ============================================================================
// Container Monitoring
// ============================================================================

export interface ListActiveMonitorsRequest {
  // Empty
}

export interface ListActiveMonitorsResponse {
  monitors: ProcessMonitor[];
  success: boolean;
  error_message: string;
}

export interface GetMonitorStatusRequest {
  container_id: string;
}

export interface GetMonitorStatusResponse {
  monitor: ProcessMonitor;
  success: boolean;
  error_message: string;
}

export interface ListMonitoringProcessesRequest {
  // Empty
}

export interface ListMonitoringProcessesResponse {
  processes: ProcessMonitor[];
  success: boolean;
  error_message: string;
}

// ============================================================================
// Network Operations
// ============================================================================

export interface ListNetworkAllocationsRequest {
  // Empty
}

export interface ListNetworkAllocationsResponse {
  allocations: NetworkAllocation[];
}

export interface GetContainerNetworkRequest {
  container_id: string;
}

export interface GetContainerNetworkResponse {
  success: boolean;
  error_message: string;
  network_config: ContainerNetworkConfig;
}

export interface SetContainerNetworkRequest {
  container_id: string;
  network_config: ContainerNetworkConfig;
}

export interface SetContainerNetworkResponse {
  success: boolean;
  error_message: string;
}

export interface SetupContainerNetworkPostStartRequest {
  container_id: string;
}

export interface SetupContainerNetworkPostStartResponse {
  success: boolean;
  error_message: string;
}

// ============================================================================
// DNS Operations
// ============================================================================

export interface ListDnsEntriesRequest {
  // Empty
}

export interface ListDnsEntriesResponse {
  entries: DnsEntry[];
  success: boolean;
  error_message: string;
}

// ============================================================================
// Cleanup Operations
// ============================================================================

export interface GetCleanupStatusRequest {
  container_id?: string;
}

export interface GetCleanupStatusResponse {
  tasks: CleanupTask[];
  success: boolean;
  error_message: string;
}

export interface ListCleanupTasksRequest {
  // Empty
}

export interface ListCleanupTasksResponse {
  tasks: CleanupTask[];
  success: boolean;
  error_message: string;
}

export interface GetCleanupTaskStatusRequest {
  task_id: number;
}

export interface GetCleanupTaskStatusResponse {
  success: boolean;
  error_message: string;
  task: CleanupTask;
}

export interface ListContainerCleanupTasksRequest {
  container_id: string;
}

export interface ListContainerCleanupTasksResponse {
  tasks: CleanupTask[];
  success: boolean;
  error_message: string;
}

export interface ForceCleanupRequest {
  container_id: string;
}

export interface ForceCleanupResponse {
  success: boolean;
  error_message: string;
  cleaned_resources: string[];
}

export interface ComprehensiveNetworkCleanupRequest {
  // Empty
}

export interface ComprehensiveNetworkCleanupResponse {
  cleaned_resources: string[];
  success: boolean;
  error_message: string;
}
