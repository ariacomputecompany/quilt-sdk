/**
 * Generic JSON Schema tool definitions for Quilt SDK
 *
 * These schemas can be used by AI frameworks to understand and call Quilt methods
 */

export interface ToolSchema {
  name: string;
  description: string;
  input_schema: {
    type: string;
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Complete tool schemas for all 31 Quilt gRPC methods
 */
export const QUILT_TOOL_SCHEMAS: ToolSchema[] = [
  // Container Operations
  {
    name: 'CreateContainer',
    description: 'Creates a new container with advanced features including namespaces, resource limits, and volume mounts',
    input_schema: {
      type: 'object',
      properties: {
        image_path: { type: 'string', description: 'Path to container image tarball' },
        command: { type: 'array', items: { type: 'string' }, description: 'Command to execute in container' },
        environment: { type: 'object', description: 'Environment variables as key-value pairs' },
        working_directory: { type: 'string', description: 'Working directory inside container' },
        setup_commands: { type: 'array', items: { type: 'string' }, description: 'Setup commands (e.g., "npm: typescript")' },
        memory_limit_mb: { type: 'integer', description: 'Memory limit in megabytes (0 = default)' },
        cpu_limit_percent: { type: 'number', description: 'CPU limit as percentage (0.0 = default)' },
        enable_pid_namespace: { type: 'boolean', description: 'Enable PID namespace isolation' },
        enable_mount_namespace: { type: 'boolean', description: 'Enable mount namespace isolation' },
        enable_uts_namespace: { type: 'boolean', description: 'Enable UTS namespace isolation (hostname)' },
        enable_ipc_namespace: { type: 'boolean', description: 'Enable IPC namespace isolation' },
        enable_network_namespace: { type: 'boolean', description: 'Enable network namespace isolation' },
        name: { type: 'string', description: 'Optional container name (must be unique)' },
        async_mode: { type: 'boolean', description: 'Create as async/long-running container' },
        mounts: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              source: { type: 'string' },
              target: { type: 'string' },
              type: { type: 'string', enum: ['BIND', 'VOLUME', 'TMPFS'] },
              readonly: { type: 'boolean' },
              options: { type: 'object' }
            }
          },
          description: 'Mount configurations for the container'
        },
      },
      required: ['image_path']
    }
  },
  {
    name: 'StartContainer',
    description: 'Starts a stopped container',
    input_schema: {
      type: 'object',
      properties: {
        container_id: { type: 'string', description: 'Container ID to start' },
        container_name: { type: 'string', description: 'Container name (alternative to ID)' }
      }
    }
  },
  {
    name: 'StopContainer',
    description: 'Stops a running container gracefully',
    input_schema: {
      type: 'object',
      properties: {
        container_id: { type: 'string', description: 'Container ID to stop' },
        timeout_seconds: { type: 'integer', description: 'Timeout before force kill (optional)' },
        container_name: { type: 'string', description: 'Container name (alternative to ID)' }
      }
    }
  },
  {
    name: 'KillContainer',
    description: 'Kills a container immediately',
    input_schema: {
      type: 'object',
      properties: {
        container_id: { type: 'string', description: 'Container ID to kill' },
        container_name: { type: 'string', description: 'Container name (alternative to ID)' }
      }
    }
  },
  {
    name: 'RemoveContainer',
    description: 'Removes a container',
    input_schema: {
      type: 'object',
      properties: {
        container_id: { type: 'string', description: 'Container ID to remove' },
        force: { type: 'boolean', description: 'Force removal even if running' },
        container_name: { type: 'string', description: 'Container name (alternative to ID)' }
      }
    }
  },
  {
    name: 'GetContainerStatus',
    description: 'Gets the detailed status of a container including CPU, memory, and network info',
    input_schema: {
      type: 'object',
      properties: {
        container_id: { type: 'string', description: 'Container ID to query' },
        container_name: { type: 'string', description: 'Container name (alternative to ID)' }
      }
    }
  },
  {
    name: 'GetContainerLogs',
    description: 'Gets the logs of a container',
    input_schema: {
      type: 'object',
      properties: {
        container_id: { type: 'string', description: 'Container ID to get logs for' },
        container_name: { type: 'string', description: 'Container name (alternative to ID)' }
      }
    }
  },
  {
    name: 'ExecContainer',
    description: 'Executes a command in a running container',
    input_schema: {
      type: 'object',
      properties: {
        container_id: { type: 'string', description: 'Container ID to execute command in' },
        command: { type: 'array', items: { type: 'string' }, description: 'Command and arguments to execute' },
        working_directory: { type: 'string', description: 'Working directory (optional)' },
        environment: { type: 'object', description: 'Additional environment variables' },
        capture_output: { type: 'boolean', description: 'Whether to capture and return output' },
        container_name: { type: 'string', description: 'Container name (alternative to ID)' },
        copy_script: { type: 'boolean', description: 'Auto-copy local script to container' }
      },
      required: ['command']
    }
  },
  {
    name: 'GetContainerByName',
    description: 'Gets a container ID by its name',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Container name to look up' }
      },
      required: ['name']
    }
  },

  // Volume Management
  {
    name: 'CreateVolume',
    description: 'Creates a new named volume',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Volume name' },
        driver: { type: 'string', description: 'Volume driver (default: "local")' },
        labels: { type: 'object', description: 'User-defined metadata' },
        options: { type: 'object', description: 'Driver-specific options' }
      },
      required: ['name']
    }
  },
  {
    name: 'RemoveVolume',
    description: 'Removes a named volume',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Volume name to remove' },
        force: { type: 'boolean', description: 'Force removal even if in use' }
      },
      required: ['name']
    }
  },
  {
    name: 'ListVolumes',
    description: 'Lists all volumes',
    input_schema: {
      type: 'object',
      properties: {
        filters: { type: 'object', description: 'Filter volumes by labels' }
      }
    }
  },
  {
    name: 'InspectVolume',
    description: 'Inspects a volume to get detailed information',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Volume name to inspect' }
      },
      required: ['name']
    }
  },

  // Health and Monitoring
  {
    name: 'GetHealth',
    description: 'Gets the health status of the Quilt server',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'GetMetrics',
    description: 'Gets metrics for containers and system including CPU, memory, network, and disk I/O',
    input_schema: {
      type: 'object',
      properties: {
        container_id: { type: 'string', description: 'Optional: specific container ID' },
        include_system: { type: 'boolean', description: 'Include system-wide metrics' },
        start_time: { type: 'integer', description: 'Start time for historical data (unix timestamp ms)' },
        end_time: { type: 'integer', description: 'End time for historical data (unix timestamp ms)' },
        interval_seconds: { type: 'integer', description: 'Aggregation interval for historical data' }
      }
    }
  },
  {
    name: 'GetSystemInfo',
    description: 'Gets system information including Quilt version and runtime details',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'StreamEvents',
    description: 'Streams container events in real-time (server-side streaming)',
    input_schema: {
      type: 'object',
      properties: {
        container_ids: { type: 'array', items: { type: 'string' }, description: 'Filter by container IDs (empty = all)' },
        event_types: { type: 'array', items: { type: 'string' }, description: 'Filter by event types (empty = all)' }
      }
    }
  },

  // Container Monitoring
  {
    name: 'ListActiveMonitors',
    description: 'Lists all active container monitors',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'GetMonitorStatus',
    description: 'Gets the status of a specific container monitor',
    input_schema: {
      type: 'object',
      properties: {
        container_id: { type: 'string', description: 'Container ID' }
      },
      required: ['container_id']
    }
  },
  {
    name: 'ListMonitoringProcesses',
    description: 'Lists all monitoring processes',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },

  // Network Operations
  {
    name: 'ListNetworkAllocations',
    description: 'Lists all network allocations for containers',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'GetContainerNetwork',
    description: 'Gets the network configuration for a container',
    input_schema: {
      type: 'object',
      properties: {
        container_id: { type: 'string', description: 'Container ID' }
      },
      required: ['container_id']
    }
  },
  {
    name: 'SetContainerNetwork',
    description: 'Sets the network configuration for a container',
    input_schema: {
      type: 'object',
      properties: {
        container_id: { type: 'string', description: 'Container ID' },
        network_config: {
          type: 'object',
          properties: {
            ip_address: { type: 'string' },
            bridge_interface: { type: 'string' },
            veth_host: { type: 'string' },
            veth_container: { type: 'string' },
            setup_completed: { type: 'boolean' },
            status: { type: 'string' }
          }
        }
      },
      required: ['container_id', 'network_config']
    }
  },
  {
    name: 'SetupContainerNetworkPostStart',
    description: 'Sets up container network after container start',
    input_schema: {
      type: 'object',
      properties: {
        container_id: { type: 'string', description: 'Container ID' }
      },
      required: ['container_id']
    }
  },

  // DNS Operations
  {
    name: 'ListDnsEntries',
    description: 'Lists all DNS entries for containers',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },

  // Cleanup Operations
  {
    name: 'GetCleanupStatus',
    description: 'Gets the cleanup status for containers',
    input_schema: {
      type: 'object',
      properties: {
        container_id: { type: 'string', description: 'Container ID (empty for all containers)' }
      }
    }
  },
  {
    name: 'ListCleanupTasks',
    description: 'Lists all cleanup tasks',
    input_schema: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'GetCleanupTaskStatus',
    description: 'Gets the status of a specific cleanup task',
    input_schema: {
      type: 'object',
      properties: {
        task_id: { type: 'integer', description: 'Cleanup task ID' }
      },
      required: ['task_id']
    }
  },
  {
    name: 'ListContainerCleanupTasks',
    description: 'Lists cleanup tasks for a specific container',
    input_schema: {
      type: 'object',
      properties: {
        container_id: { type: 'string', description: 'Container ID' }
      },
      required: ['container_id']
    }
  },
  {
    name: 'ForceCleanup',
    description: 'Forces cleanup of a container and its resources',
    input_schema: {
      type: 'object',
      properties: {
        container_id: { type: 'string', description: 'Container ID' }
      },
      required: ['container_id']
    }
  },
  {
    name: 'ComprehensiveNetworkCleanup',
    description: 'Performs comprehensive network cleanup of all resources',
    input_schema: {
      type: 'object',
      properties: {}
    }
  }
];

/**
 * Get a tool schema by name
 */
export function getToolSchema(name: string): ToolSchema | undefined {
  return QUILT_TOOL_SCHEMAS.find(schema => schema.name === name);
}

/**
 * Get all tool schema names
 */
export function getToolNames(): string[] {
  return QUILT_TOOL_SCHEMAS.map(schema => schema.name);
}
