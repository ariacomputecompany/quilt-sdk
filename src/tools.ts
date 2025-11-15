/**
 * OpenAI Tool Schemas for Quilt SDK
 *
 * Auto-generated function calling definitions for AI agents.
 * Optimized for OpenAI's function calling API.
 */

export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required?: string[];
    };
  };
}

/**
 * Complete set of Quilt SDK tools for OpenAI function calling
 */
export const QUILT_TOOLS: OpenAITool[] = [
  // Container Operations
  {
    type: 'function',
    function: {
      name: 'create_container',
      description: 'Create and start a new isolated container. Containers include busybox utilities (sh, ls, cat, grep, wget, etc). Runs async by default (non-blocking). Image handled automatically.',
      parameters: {
        type: 'object',
        properties: {
          cmd: { type: 'array', items: { type: 'string' }, description: 'Command to run. Default shell: /bin/sh. Busybox utilities available.' },
          env: { type: 'object', description: 'Environment variables as key-value pairs' },
          workdir: { type: 'string', description: 'Working directory (default: /)' },
          memory: { type: 'number', description: 'Memory limit in MB' },
          cpu: { type: 'number', description: 'CPU limit percentage (0-100)' },
          name: { type: 'string', description: 'Container name for identification' },
          mounts: {
            type: 'array',
            description: 'Volume mounts for persistent data',
            items: {
              type: 'object',
              properties: {
                src: { type: 'string', description: 'Source path on host' },
                dst: { type: 'string', description: 'Destination path in container' },
                type: { type: 'string', enum: ['BIND', 'VOLUME', 'TMPFS'] },
                ro: { type: 'boolean', description: 'Read-only mount' }
              }
            }
          }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'start_container',
      description: 'Start a stopped container. Use id or name to identify.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Container ID' },
          name: { type: 'string', description: 'Container name' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'stop_container',
      description: 'Stop running container gracefully (10s grace period, then force kill).',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Container ID' },
          name: { type: 'string', description: 'Container name' },
          timeout: { type: 'number', description: 'Grace period in seconds (default: 10)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'kill_container',
      description: 'Immediately terminate container (no graceful shutdown).',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Container ID' },
          name: { type: 'string', description: 'Container name' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'remove_container',
      description: 'Delete container and cleanup resources (network, filesystem, cgroups).',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Container ID' },
          name: { type: 'string', description: 'Container name' },
          force: { type: 'boolean', description: 'Force remove even if running' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_container_status',
      description: 'Get container state: running/stopped/exited, PID, exit code, memory usage, IP.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Container ID' },
          name: { type: 'string', description: 'Container name' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_container_logs',
      description: 'Retrieve stdout/stderr logs from container execution.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Container ID' },
          name: { type: 'string', description: 'Container name' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'exec_container',
      description: 'Run command in container and get output. Busybox utilities available (sh, ls, cat, grep, wget, etc).',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Container ID' },
          name: { type: 'string', description: 'Container name' },
          cmd: { type: 'array', items: { type: 'string' }, description: 'Command and args. Use /bin/sh for shell.' },
          env: { type: 'object', description: 'Environment variables' },
          workdir: { type: 'string', description: 'Working directory' },
          capture: { type: 'boolean', description: 'Capture stdout/stderr (default: true)' }
        },
        required: ['cmd']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'find_container',
      description: 'Look up container ID by name.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Container name' }
        },
        required: ['name']
      }
    }
  },

  // Volume Operations
  {
    type: 'function',
    function: {
      name: 'create_volume',
      description: 'Create persistent storage volume. Survives container deletion.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Volume name' },
          driver: { type: 'string', description: 'Storage driver (default: local)' },
          labels: { type: 'object', description: 'Metadata labels' },
          options: { type: 'object', description: 'Driver options' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'remove_volume',
      description: 'Delete volume and its data permanently.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Volume name' },
          force: { type: 'boolean', description: 'Force remove if in use' }
        },
        required: ['name']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_volumes',
      description: 'List all volumes. Can filter by labels.',
      parameters: {
        type: 'object',
        properties: {
          filters: { type: 'object', description: 'Label filters (key-value pairs)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'inspect_volume',
      description: 'Get volume details: mount point, size, labels, creation time.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Volume name' }
        },
        required: ['name']
      }
    }
  },

  // System Operations
  {
    type: 'function',
    function: {
      name: 'get_health',
      description: 'Check runtime health: uptime, container counts, subsystem status.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_metrics',
      description: 'Get resource usage: CPU, memory, network I/O, disk I/O. Per-container or system-wide.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Container ID (omit for all)' },
          include: { type: 'boolean', description: 'Include system metrics (default: true)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_system_info',
      description: 'Get runtime info: version, platform, enabled features, resource limits.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },

  // Network Operations
  {
    type: 'function',
    function: {
      name: 'list_network_allocations',
      description: 'List container IP addresses and network interfaces.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_container_network',
      description: 'Get container network config: IP, bridge, veth interfaces.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Container ID' }
        },
        required: ['id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'set_container_network',
      description: 'Configure container network: set IP, bridge interface.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Container ID' },
          networkConfig: {
            type: 'object',
            description: 'Network settings',
            properties: {
              ip: { type: 'string', description: 'IP address' },
              bridge: { type: 'string', description: 'Bridge name' }
            }
          }
        },
        required: ['id', 'networkConfig']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_dns_entries',
      description: 'List DNS mappings: container names to IPs.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },

  // Monitoring Operations
  {
    type: 'function',
    function: {
      name: 'list_monitors',
      description: 'List active process monitors tracking container lifecycle.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_monitor_status',
      description: 'Get monitor status: PID, last check time, error count.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Container ID' }
        },
        required: ['id']
      }
    }
  },

  // Cleanup Operations
  {
    type: 'function',
    function: {
      name: 'get_cleanup_status',
      description: 'Get status of cleanup tasks: pending, running, completed.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Container ID (omit for all)' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'list_cleanup_tasks',
      description: 'List all cleanup tasks: cgroups, network, filesystem.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'force_cleanup',
      description: 'Force immediate cleanup of container resources (use if normal cleanup fails).',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Container ID' }
        },
        required: ['id']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'network_cleanup',
      description: 'Cleanup stale network resources: orphaned IPs, dead interfaces, iptables rules.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  }
];
