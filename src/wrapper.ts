/**
 * Quilt SDK - Clean API Wrapper
 *
 * Provides a streamlined, agent-friendly interface to the Quilt container runtime via HTTP API.
 * Features:
 * - Single default export
 * - Property name normalization (short/camelCase → snake_case)
 * - Smart defaults optimized for agent use
 * - Full type safety
 */

import { HttpClient, QuiltHttpError } from './http-client';
import { QuiltClientOptions, QuiltConnectionError, QuiltApiError } from './types';
import * as I from './interfaces';
import { normalize } from './utils/normalize';
import {
  CONTAINER_DEFAULTS,
  EXEC_DEFAULTS,
  STOP_DEFAULTS,
  VOLUME_DEFAULTS,
  METRICS_DEFAULTS,
} from './utils/defaults';
import { loadConfig, resolveConfig } from './config';

/**
 * Main Quilt class - clean, type-safe container runtime client
 *
 * @example
 * ```typescript
 * import Quilt from 'quilt-sdk';
 *
 * const quilt = await Quilt.connect();
 *
 * await quilt.create({
 *   image: '/path/to/alpine.tar',
 *   cmd: ['node', 'app.js'],
 *   env: { PORT: '3000' }
 * });
 * ```
 */
export default class Quilt {
  private http: HttpClient;
  private readonly options: { apiBaseUrl: string; token?: string; timeout: number };

  constructor(options: QuiltClientOptions = {}) {
    // Support apiKey as an alias for token
    const token = options.apiKey || options.token;

    this.options = {
      apiBaseUrl: options.apiBaseUrl || 'http://localhost:8080',
      token,
      timeout: options.timeout || 30000,
    };

    this.http = new HttpClient({
      baseUrl: this.options.apiBaseUrl,
      timeout: this.options.timeout,
      token: this.options.token,
    });
  }

  /**
   * Static factory method for clean initialization
   *
   * Automatically loads configuration from ~/.quilt/config.json if no explicit
   * token/apiKey is provided. Environment variables QUILT_API_KEY and
   * QUILT_API_BASE_URL take precedence over config file values.
   *
   * @example
   * ```typescript
   * // Auto-load from config file
   * const quilt = await Quilt.connect();
   *
   * // Or provide explicit options
   * const quilt = await Quilt.connect({ apiBaseUrl: 'http://localhost:8080' });
   * ```
   */
  static async connect(options?: QuiltClientOptions): Promise<Quilt> {
    // Auto-load config if no explicit token/apiKey provided
    if (!options?.token && !options?.apiKey) {
      const config = loadConfig();
      const resolved = resolveConfig(config);

      options = {
        ...options,
        apiBaseUrl: options?.apiBaseUrl || resolved.apiBaseUrl,
        token: resolved.apiKey,
        timeout: options?.timeout || resolved.timeout,
      };
    }

    const quilt = new Quilt(options);
    await quilt.connect();
    return quilt;
  }

  /**
   * Initialize the client and verify server connectivity
   */
  async connect(): Promise<void> {
    try {
      // Test connection with health endpoint (doesn't require auth)
      await this.http.get('/health');
    } catch (error) {
      if (error instanceof QuiltHttpError) {
        throw new QuiltConnectionError(
          `Failed to connect to Quilt API at ${this.options.apiBaseUrl}: ${error.message}`,
          this.options.apiBaseUrl
        );
      }
      throw error;
    }
  }

  /**
   * Disconnect from the server (cleanup method, no-op for HTTP client)
   */
  async disconnect(): Promise<void> {
    // No cleanup needed for HTTP client
  }

  /**
   * Handle HTTP errors and convert to QuiltApiError
   */
  private handleError(error: unknown, method: string): never {
    if (error instanceof QuiltHttpError) {
      throw new QuiltApiError(
        error.message,
        method,
        error.statusCode,
        error.details
      );
    }
    throw error;
  }

  // ============================================================================
  // CONTAINER OPERATIONS
  // ============================================================================

  /**
   * Create a new isolated container
   *
   * @example
   * ```typescript
   * await quilt.create({
   *   cmd: ['/bin/sh', '-c', 'echo hello'],
   *   env: { PORT: '3000' },
   *   memory: 512
   * });
   * ```
   */
  async create(params: Record<string, unknown>): Promise<I.CreateContainerResponse> {
    const withDefaults: Record<string, unknown> = { ...params };

    // Apply defaults
    if (withDefaults.async_mode === undefined) withDefaults.async_mode = true;
    if (!withDefaults.image && !withDefaults.image_path) {
      withDefaults.image_path = CONTAINER_DEFAULTS.image_path;
    }

    // Normalize property names
    const normalized = normalize<I.CreateContainerRequest>(withDefaults);

    try {
      return await this.http.post<I.CreateContainerResponse>('/containers', normalized);
    } catch (error) {
      return this.handleError(error, 'create');
    }
  }

  /**
   * Start a stopped container
   */
  async start(params: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    const normalized = normalize<{ container_id?: string; container_name?: string }>(params);
    const containerId = normalized.container_id || await this.resolveContainerId(normalized.container_name);

    try {
      return await this.http.post(`/containers/${containerId}/start`);
    } catch (error) {
      return this.handleError(error, 'start');
    }
  }

  /**
   * Stop a running container gracefully
   */
  async stop(params: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    const withDefaults = { ...STOP_DEFAULTS, ...params };
    const normalized = normalize<{ container_id?: string; container_name?: string }>(withDefaults);
    const containerId = normalized.container_id || await this.resolveContainerId(normalized.container_name);

    try {
      return await this.http.post(`/containers/${containerId}/stop`);
    } catch (error) {
      return this.handleError(error, 'stop');
    }
  }

  /**
   * Kill a running container immediately
   */
  async kill(params: Record<string, unknown>): Promise<{ success: boolean; message: string }> {
    const normalized = normalize<{ container_id?: string; container_name?: string }>(params);
    const containerId = normalized.container_id || await this.resolveContainerId(normalized.container_name);

    try {
      return await this.http.post(`/containers/${containerId}/kill`);
    } catch (error) {
      return this.handleError(error, 'kill');
    }
  }

  /**
   * Remove a container
   */
  async remove(params: Record<string, unknown>): Promise<void> {
    const normalized = normalize<{ container_id?: string; container_name?: string }>(params);
    const containerId = normalized.container_id || await this.resolveContainerId(normalized.container_name);

    try {
      await this.http.delete(`/containers/${containerId}`);
    } catch (error) {
      return this.handleError(error, 'remove');
    }
  }

  /**
   * Get container status
   */
  async status(params: Record<string, unknown>): Promise<I.ContainerInfo> {
    const normalized = normalize<{ container_id?: string; container_name?: string }>(params);
    const containerId = normalized.container_id || await this.resolveContainerId(normalized.container_name);

    try {
      return await this.http.get<I.ContainerInfo>(`/containers/${containerId}`);
    } catch (error) {
      return this.handleError(error, 'status');
    }
  }

  /**
   * List all containers
   */
  async list(): Promise<I.ListContainersResponse> {
    try {
      return await this.http.get<I.ListContainersResponse>('/containers');
    } catch (error) {
      return this.handleError(error, 'list');
    }
  }

  /**
   * Get container logs
   */
  async logs(params: Record<string, unknown>): Promise<I.GetContainerLogsResponse> {
    const normalized = normalize<{ container_id?: string; container_name?: string }>(params);
    const containerId = normalized.container_id || await this.resolveContainerId(normalized.container_name);

    try {
      return await this.http.get<I.GetContainerLogsResponse>(`/containers/${containerId}/logs`);
    } catch (error) {
      return this.handleError(error, 'logs');
    }
  }

  /**
   * Execute a command in a running container
   *
   * Supports multiple command formats:
   * - command: "string" - Simple command (wrapped in sh -c)
   * - command: ["array"] - Command with arguments
   * - command: { cmd_b64: "base64" } - Base64-encoded script
   * - command: { parts_b64: ["b64", "parts"] } - Base64-encoded parts
   * - script: "multiline\nscript" - Auto-encoded to base64
   */
  async exec(params: Record<string, unknown>): Promise<I.ExecContainerResponse> {
    const withDefaults = { ...EXEC_DEFAULTS, ...params };
    const normalized = normalize<I.ExecContainerRequest>(withDefaults);
    const containerId = normalized.container_id || await this.resolveContainerId(normalized.container_name);

    // Build command body - handle different formats
    let commandBody: unknown;

    if (normalized.script) {
      // Auto-encode script to base64 for multi-line support
      const encoded = Buffer.from(normalized.script).toString('base64');
      commandBody = { cmd_b64: encoded };
    } else if (typeof normalized.command === 'string') {
      // String command - send as-is (backend wraps in sh -c)
      commandBody = normalized.command;
    } else if (Array.isArray(normalized.command)) {
      // Array command - send as-is
      commandBody = normalized.command;
    } else if (normalized.command && typeof normalized.command === 'object') {
      // Structured command (cmd_b64 or parts_b64) - pass through
      commandBody = normalized.command;
    } else {
      throw new Error('exec requires command or script parameter');
    }

    const body = {
      command: commandBody,
      workdir: normalized.working_directory,
      capture_output: normalized.capture_output,
    };

    try {
      return await this.http.post<I.ExecContainerResponse>(`/containers/${containerId}/exec`, body);
    } catch (error) {
      return this.handleError(error, 'exec');
    }
  }

  /**
   * Get container by name
   */
  async getContainerByName(params: Record<string, unknown>): Promise<I.GetContainerByNameResponse> {
    const normalized = normalize<{ name: string }>(params);

    try {
      return await this.http.get<I.GetContainerByNameResponse>(`/containers/by-name/${normalized.name}`);
    } catch (error) {
      return this.handleError(error, 'getContainerByName');
    }
  }

  // ============================================================================
  // VOLUME MANAGEMENT
  // ============================================================================

  /**
   * Create a new volume
   */
  async createVolume(params: Record<string, unknown>): Promise<I.CreateVolumeResponse> {
    const withDefaults = { ...VOLUME_DEFAULTS, ...params };
    const normalized = normalize<I.CreateVolumeRequest>(withDefaults);

    try {
      const volume = await this.http.post<I.Volume>('/volumes', normalized);
      return {
        success: true,
        error_message: '',
        volume,
      };
    } catch (error) {
      return this.handleError(error, 'createVolume');
    }
  }

  /**
   * Remove a volume
   */
  async removeVolume(params: Record<string, unknown>): Promise<I.RemoveVolumeResponse> {
    const normalized = normalize<{ name: string }>(params);

    try {
      await this.http.delete(`/volumes/${normalized.name}`);
      return { success: true, error_message: '' };
    } catch (error) {
      return this.handleError(error, 'removeVolume');
    }
  }

  /**
   * List all volumes
   */
  async listVolumes(): Promise<I.ListVolumesResponse> {
    try {
      return await this.http.get<I.ListVolumesResponse>('/volumes');
    } catch (error) {
      return this.handleError(error, 'listVolumes');
    }
  }

  /**
   * Inspect a volume
   */
  async inspectVolume(params: Record<string, unknown>): Promise<I.InspectVolumeResponse> {
    const normalized = normalize<{ name: string }>(params);

    try {
      const volume = await this.http.get<I.Volume>(`/volumes/${normalized.name}/inspect`);
      return {
        found: true,
        volume,
        error_message: '',
      };
    } catch (error) {
      if (error instanceof QuiltHttpError && error.statusCode === 404) {
        return {
          found: false,
          volume: {} as I.Volume,
          error_message: 'Volume not found',
        };
      }
      return this.handleError(error, 'inspectVolume');
    }
  }

  // ============================================================================
  // HEALTH & SYSTEM
  // ============================================================================

  /**
   * Get server health status
   */
  async health(): Promise<I.GetHealthResponse> {
    try {
      return await this.http.get<I.GetHealthResponse>('/health');
    } catch (error) {
      return this.handleError(error, 'health');
    }
  }

  /**
   * Get container or system metrics
   */
  async getMetrics(params: Record<string, unknown> = {}): Promise<I.GetMetricsResponse> {
    const withDefaults = { ...METRICS_DEFAULTS, ...params };
    const normalized = normalize<I.GetMetricsRequest>(withDefaults);

    let path = '/system/metrics';
    const queryParams: string[] = [];

    if (normalized.container_id) {
      path = `/containers/${normalized.container_id}/metrics`;
    }

    if (normalized.start_time) queryParams.push(`start_time=${normalized.start_time}`);
    if (normalized.end_time) queryParams.push(`end_time=${normalized.end_time}`);
    if (normalized.include_system !== undefined) queryParams.push(`include_system=${normalized.include_system}`);

    if (queryParams.length > 0) {
      path += `?${queryParams.join('&')}`;
    }

    try {
      return await this.http.get<I.GetMetricsResponse>(path);
    } catch (error) {
      return this.handleError(error, 'getMetrics');
    }
  }

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<I.GetSystemInfoResponse> {
    try {
      return await this.http.get<I.GetSystemInfoResponse>('/system/info');
    } catch (error) {
      return this.handleError(error, 'getSystemInfo');
    }
  }

  /**
   * Stream events (not supported in HTTP API)
   * @deprecated HTTP API does not support streaming events
   */
  async streamEvents(): Promise<never> {
    throw new Error('streamEvents is not supported in the HTTP API. Use polling with getMetrics or health instead.');
  }

  // ============================================================================
  // MONITORING
  // ============================================================================

  /**
   * List active monitors
   */
  async listMonitors(): Promise<I.ListActiveMonitorsResponse> {
    try {
      return await this.http.get<I.ListActiveMonitorsResponse>('/monitors');
    } catch (error) {
      return this.handleError(error, 'listMonitors');
    }
  }

  /**
   * Get monitor status for a container
   */
  async getMonitorStatus(params: Record<string, unknown>): Promise<I.GetMonitorStatusResponse> {
    const normalized = normalize<{ container_id: string }>(params);

    try {
      const monitor = await this.http.get<I.ProcessMonitor>(`/monitors/${normalized.container_id}`);
      return {
        monitor,
        success: true,
        error_message: '',
      };
    } catch (error) {
      return this.handleError(error, 'getMonitorStatus');
    }
  }

  /**
   * List monitoring processes
   */
  async listMonitoringProcesses(): Promise<I.ListMonitoringProcessesResponse> {
    try {
      return await this.http.get<I.ListMonitoringProcessesResponse>('/monitors/processes');
    } catch (error) {
      return this.handleError(error, 'listMonitoringProcesses');
    }
  }

  // ============================================================================
  // NETWORK OPERATIONS
  // ============================================================================

  /**
   * List network allocations
   */
  async listNetworkAllocations(): Promise<I.ListNetworkAllocationsResponse> {
    try {
      return await this.http.get<I.ListNetworkAllocationsResponse>('/network/allocations');
    } catch (error) {
      return this.handleError(error, 'listNetworkAllocations');
    }
  }

  /**
   * Get container network configuration
   */
  async getContainerNetwork(params: Record<string, unknown>): Promise<I.GetContainerNetworkResponse> {
    const normalized = normalize<{ container_id: string }>(params);

    try {
      const network_config = await this.http.get<I.ContainerNetworkConfig>(`/containers/${normalized.container_id}/network`);
      return {
        success: true,
        error_message: '',
        network_config,
      };
    } catch (error) {
      return this.handleError(error, 'getContainerNetwork');
    }
  }

  /**
   * Set container network configuration
   */
  async setContainerNetwork(params: Record<string, unknown>): Promise<I.SetContainerNetworkResponse> {
    const normalized = normalize<I.SetContainerNetworkRequest>(params);

    const body = {
      ip_address: normalized.network_config?.ip_address,
      gateway: normalized.network_config?.setup_completed ? null : undefined,
    };

    try {
      const result = await this.http.put<{ success: boolean; message: string }>(
        `/containers/${normalized.container_id}/network`,
        body
      );
      return {
        success: result.success,
        error_message: result.success ? '' : result.message,
      };
    } catch (error) {
      return this.handleError(error, 'setContainerNetwork');
    }
  }

  /**
   * Setup container network post-start
   */
  async setupContainerNetworkPostStart(params: Record<string, unknown>): Promise<I.SetupContainerNetworkPostStartResponse> {
    const normalized = normalize<{ container_id: string }>(params);

    try {
      const result = await this.http.post<{ success: boolean; message: string }>(
        `/containers/${normalized.container_id}/network/setup`
      );
      return {
        success: result.success,
        error_message: result.success ? '' : result.message,
      };
    } catch (error) {
      return this.handleError(error, 'setupContainerNetworkPostStart');
    }
  }

  // ============================================================================
  // DNS OPERATIONS
  // ============================================================================

  /**
   * List DNS entries
   */
  async listDNSEntries(): Promise<I.ListDnsEntriesResponse> {
    try {
      return await this.http.get<I.ListDnsEntriesResponse>('/dns/entries');
    } catch (error) {
      return this.handleError(error, 'listDNSEntries');
    }
  }

  // ============================================================================
  // CLEANUP OPERATIONS
  // ============================================================================

  /**
   * Get cleanup status
   */
  async getCleanupStatus(): Promise<I.GetCleanupStatusResponse> {
    try {
      const result = await this.http.get<{ pending_tasks: number; completed_tasks: number; failed_tasks: number; last_cleanup: number }>('/cleanup/status');
      return {
        tasks: [],
        success: true,
        error_message: '',
      };
    } catch (error) {
      return this.handleError(error, 'getCleanupStatus');
    }
  }

  /**
   * List cleanup tasks
   */
  async listCleanupTasks(): Promise<I.ListCleanupTasksResponse> {
    try {
      return await this.http.get<I.ListCleanupTasksResponse>('/cleanup/tasks');
    } catch (error) {
      return this.handleError(error, 'listCleanupTasks');
    }
  }

  /**
   * Get cleanup task status
   */
  async getCleanupTaskStatus(params: Record<string, unknown>): Promise<I.GetCleanupTaskStatusResponse> {
    const normalized = normalize<{ task_id: number }>(params);

    try {
      const task = await this.http.get<I.CleanupTask>(`/cleanup/tasks/${normalized.task_id}`);
      return {
        success: true,
        error_message: '',
        task,
      };
    } catch (error) {
      return this.handleError(error, 'getCleanupTaskStatus');
    }
  }

  /**
   * List container cleanup tasks
   */
  async listContainerCleanupTasks(params: Record<string, unknown>): Promise<I.ListContainerCleanupTasksResponse> {
    const normalized = normalize<{ container_id: string }>(params);

    try {
      return await this.http.get<I.ListContainerCleanupTasksResponse>(`/containers/${normalized.container_id}/cleanup/tasks`);
    } catch (error) {
      return this.handleError(error, 'listContainerCleanupTasks');
    }
  }

  /**
   * Force cleanup a container
   */
  async forceCleanupContainer(params: Record<string, unknown>): Promise<I.ForceCleanupResponse> {
    const normalized = normalize<{ container_id: string; confirm: boolean; remove_volumes: boolean }>(params);

    const body = {
      confirm: normalized.confirm || true,
      remove_volumes: normalized.remove_volumes || false,
    };

    try {
      const result = await this.http.post<{ success: boolean; resources_cleaned: string[]; errors: string[] }>(
        `/containers/${normalized.container_id}/cleanup/force`,
        body
      );
      return {
        success: result.success,
        error_message: result.errors.length > 0 ? result.errors.join(', ') : '',
        cleaned_resources: result.resources_cleaned,
      };
    } catch (error) {
      return this.handleError(error, 'forceCleanupContainer');
    }
  }

  /**
   * Comprehensive network cleanup
   */
  async comprehensiveNetworkCleanup(params: Record<string, unknown> = {}): Promise<I.ComprehensiveNetworkCleanupResponse> {
    const normalized = normalize<{ dry_run?: boolean }>(params);

    const body = {
      dry_run: normalized.dry_run || false,
    };

    try {
      const result = await this.http.post<{ cleaned_allocations: string[]; removed_interfaces: string[]; errors: string[] }>(
        '/admin/network/cleanup',
        body
      );
      return {
        cleaned_resources: [...result.cleaned_allocations, ...result.removed_interfaces],
        success: result.errors.length === 0,
        error_message: result.errors.length > 0 ? result.errors.join(', ') : '',
      };
    } catch (error) {
      return this.handleError(error, 'comprehensiveNetworkCleanup');
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Resolve container name to ID
   */
  private async resolveContainerId(name?: string): Promise<string> {
    if (!name) {
      throw new Error('Either container_id or container_name must be provided');
    }

    const result = await this.getContainerByName({ name });

    if (!result.found || !result.container_id) {
      throw new Error(`Container '${name}' not found`);
    }

    return result.container_id;
  }
}
