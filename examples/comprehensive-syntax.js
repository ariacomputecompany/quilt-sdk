"use strict";
/**
 * Comprehensive Syntax Demonstration - TypeScript Edition
 *
 * This example showcases the clean, intuitive, and FULLY TYPE-SAFE syntax
 * of the Quilt SDK across all major operations and patterns.
 */
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../dist/index");
async function demonstrateSyntax() {
    console.log('═══════════════════════════════════════════════════════');
    console.log('  Quilt SDK - Comprehensive TypeScript Syntax Demo');
    console.log('═══════════════════════════════════════════════════════\n');
    // ═══════════════════════════════════════════════════════════════
    // 1. CLIENT INITIALIZATION - Clean and simple
    // ═══════════════════════════════════════════════════════════════
    console.log('1️⃣  CLIENT INITIALIZATION\n');
    const client = new index_1.QuiltClient({
        autoStart: true,
        serverAddress: '127.0.0.1:50051',
        startupTimeoutMs: 5000,
        shutdownTimeoutMs: 3000
    });
    await client.connect();
    console.log('✓ Client connected\n');
    // ═══════════════════════════════════════════════════════════════
    // 2. HEALTH & SYSTEM INFO - Simple async/await with types
    // ═══════════════════════════════════════════════════════════════
    console.log('2️⃣  HEALTH & SYSTEM INFO\n');
    const health = await client.getHealth();
    console.log('Health:', {
        status: health.status,
        uptime: health.uptime_seconds + 's',
        containers: `${health.containers_running}/${health.containers_total}`
    });
    const systemInfo = await client.getSystemInfo();
    console.log('System:', {
        version: systemInfo.version,
        runtime: systemInfo.runtime
    });
    console.log();
    // ═══════════════════════════════════════════════════════════════
    // 3. CONTAINER CREATION - Rich options, clean syntax, FULLY TYPED
    // ═══════════════════════════════════════════════════════════════
    console.log('3️⃣  CONTAINER CREATION (Full Options - Type-Safe)\n');
    const containerConfig = {
        // Basic configuration
        image_path: '/path/to/alpine.tar',
        name: 'demo-app',
        command: ['node', 'server.js'],
        working_directory: '/app',
        // Environment variables - typed as Record<string, string>
        environment: {
            NODE_ENV: 'production',
            PORT: '3000',
            DATABASE_URL: 'postgres://localhost/mydb'
        },
        // Resource limits - typed as number
        memory_limit_mb: 512,
        cpu_limit_percent: 50.0,
        // Namespace isolation - typed as boolean
        enable_pid_namespace: true,
        enable_mount_namespace: true,
        enable_uts_namespace: true,
        enable_ipc_namespace: true,
        enable_network_namespace: true,
        // Container mode
        async_mode: true,
        // Volume mounts - typed array of Mount objects
        mounts: [
            {
                source: '/host/data',
                target: '/app/data',
                type: index_1.QuiltTypes.MountType.BIND,
                readonly: false
            },
            {
                source: 'app-logs',
                target: '/app/logs',
                type: index_1.QuiltTypes.MountType.VOLUME,
                readonly: false
            },
            {
                source: '',
                target: '/tmp',
                type: index_1.QuiltTypes.MountType.TMPFS,
                readonly: false,
                options: {
                    size: '100m'
                }
            }
        ],
        // Setup commands for dynamic dependencies
        setup_commands: [
            'npm: express pg redis',
            'pip: requests flask'
        ]
    };
    // Note: This would fail without a real image, so we'll skip it
    console.log('Container config prepared (skipping actual creation for demo)');
    console.log('✓ All properties are type-checked at compile time\n');
    // ═══════════════════════════════════════════════════════════════
    // 4. CONTAINER OPERATIONS - Consistent typed patterns
    // ═══════════════════════════════════════════════════════════════
    console.log('4️⃣  CONTAINER OPERATIONS (Type-Safe)\n');
    console.log('Syntax patterns with full type safety:');
    console.log(`
  // Start by ID or name - fully typed request
  const startByIdReq: QuiltTypes.StartContainerRequest = {
    container_id: 'abc123'
  };
  await client.startContainer(startByIdReq);

  const startByNameReq: QuiltTypes.StartContainerRequest = {
    container_name: 'demo-app'
  };
  await client.startContainer(startByNameReq);

  // Get status - typed request and response
  const statusReq: QuiltTypes.GetContainerStatusRequest = {
    container_id: 'abc123'
  };
  const status: QuiltTypes.GetContainerStatusResponse =
    await client.getContainerStatus(statusReq);

  // TypeScript knows all these properties exist:
  console.log({
    id: status.container_id,        // string
    status: status.status,           // ContainerStatus enum
    exitCode: status.exit_code,      // number
    pid: status.pid,                 // number
    memoryUsage: status.memory_usage_bytes, // number
    ipAddress: status.ip_address     // string
  });

  // Execute commands with output capture - fully typed
  const execReq: QuiltTypes.ExecContainerRequest = {
    container_id: 'abc123',
    command: ['npm', 'run', 'test'],
    working_directory: '/app',
    environment: { CI: 'true' },
    capture_output: true
  };
  const result: QuiltTypes.ExecContainerResponse =
    await client.execContainer(execReq);

  console.log({
    stdout: result.stdout,       // string
    stderr: result.stderr,       // string
    exitCode: result.exit_code,  // number
    success: result.success      // boolean
  });

  // Get logs - typed request and response
  const logsReq: QuiltTypes.GetContainerLogsRequest = {
    container_id: 'abc123'
  };
  const logs: QuiltTypes.GetContainerLogsResponse =
    await client.getContainerLogs(logsReq);

  // logs.logs is typed as LogEntry[]
  for (const entry of logs.logs) {
    console.log(\`[\${entry.timestamp}] \${entry.message}\`);
  }

  // Stop with timeout - typed request
  const stopReq: QuiltTypes.StopContainerRequest = {
    container_id: 'abc123',
    timeout_seconds: 10
  };
  await client.stopContainer(stopReq);

  // Remove with force flag - typed request
  const removeReq: QuiltTypes.RemoveContainerRequest = {
    container_id: 'abc123',
    force: true
  };
  await client.removeContainer(removeReq);
  `);
    // ═══════════════════════════════════════════════════════════════
    // 5. VOLUME MANAGEMENT - CRUD operations with full type safety
    // ═══════════════════════════════════════════════════════════════
    console.log('5️⃣  VOLUME MANAGEMENT (Type-Safe CRUD)\n');
    console.log('Syntax patterns with types:');
    console.log(`
  // Create volume with metadata - fully typed request
  const createVolReq: QuiltTypes.CreateVolumeRequest = {
    name: 'postgres-data',
    driver: 'local',
    labels: {
      app: 'myapp',
      environment: 'production'
    },
    options: {
      type: 'ext4'
    }
  };
  const volResult: QuiltTypes.CreateVolumeResponse =
    await client.createVolume(createVolReq);

  // Result is fully typed
  console.log({
    success: volResult.success,              // boolean
    volumeName: volResult.volume.name,       // string
    mountPoint: volResult.volume.mount_point // string
  });

  // List with filters - typed request
  const listReq: QuiltTypes.ListVolumesRequest = {
    filters: { app: 'myapp' }
  };
  const volumes: QuiltTypes.ListVolumesResponse =
    await client.listVolumes(listReq);

  // volumes.volumes is typed as Volume[]
  for (const vol of volumes.volumes) {
    console.log({
      name: vol.name,              // string
      driver: vol.driver,          // string
      mountPoint: vol.mount_point, // string
      createdAt: vol.created_at    // number
    });
  }

  // Inspect by name - typed request and response
  const inspectReq: QuiltTypes.InspectVolumeRequest = {
    name: 'postgres-data'
  };
  const details: QuiltTypes.InspectVolumeResponse =
    await client.inspectVolume(inspectReq);

  if (details.found) {
    console.log('Volume found:', details.volume);
  }

  // Remove - typed request
  const removeVolReq: QuiltTypes.RemoveVolumeRequest = {
    name: 'postgres-data',
    force: false
  };
  await client.removeVolume(removeVolReq);
  `);
    // Demonstrate actual list
    const volumesResponse = await client.listVolumes({});
    console.log(`✓ Listed ${volumesResponse.volumes?.length || 0} volumes\n`);
    // ═══════════════════════════════════════════════════════════════
    // 6. METRICS & MONITORING - Rich data structures, fully typed
    // ═══════════════════════════════════════════════════════════════
    console.log('6️⃣  METRICS & MONITORING (Fully Typed)\n');
    console.log('Syntax patterns with complete type safety:');
    console.log(`
  // Get container-specific metrics - typed request
  const metricsReq: QuiltTypes.GetMetricsRequest = {
    container_id: 'abc123',
    include_system: true
  };
  const metrics: QuiltTypes.GetMetricsResponse =
    await client.getMetrics(metricsReq);

  // Access nested metric data - all properties are typed
  // metrics.container_metrics is typed as ContainerMetric[]
  for (const metric of metrics.container_metrics) {
    console.log({
      cpuUsage: metric.cpu_usage_usec,         // number
      cpuUser: metric.cpu_user_usec,           // number
      cpuSystem: metric.cpu_system_usec,       // number
      memoryCurrent: metric.memory_current_bytes, // number
      memoryPeak: metric.memory_peak_bytes,    // number
      memoryLimit: metric.memory_limit_bytes,  // number
      networkRx: metric.network_rx_bytes,      // number
      networkTx: metric.network_tx_bytes,      // number
      diskRead: metric.disk_read_bytes,        // number
      diskWrite: metric.disk_write_bytes       // number
    });
  }

  // System-wide metrics - typed as SystemMetrics
  const sys: QuiltTypes.SystemMetrics = metrics.system_metrics;
  console.log({
    memory: \`\${sys.memory_used_mb}/\${sys.memory_total_mb}MB\`,
    cpus: sys.cpu_count,                // number
    load: sys.load_average,             // number[]
    containers: {
      total: sys.containers_total,      // number
      running: sys.containers_running,  // number
      stopped: sys.containers_stopped   // number
    }
  });

  // Monitor status - typed responses
  const monitors: QuiltTypes.ListActiveMonitorsResponse =
    await client.listActiveMonitors();

  const monitorReq: QuiltTypes.GetMonitorStatusRequest = {
    container_id: 'abc123'
  };
  const monitorStatus: QuiltTypes.GetMonitorStatusResponse =
    await client.getMonitorStatus(monitorReq);
  `);
    // ═══════════════════════════════════════════════════════════════
    // 7. STREAMING - AsyncIterator pattern with typed events
    // ═══════════════════════════════════════════════════════════════
    console.log('7️⃣  EVENT STREAMING (Typed AsyncIterator)\n');
    console.log('Syntax pattern with full type safety:');
    console.log(`
  // Stream events with for-await-of - typed request
  const streamReq: QuiltTypes.StreamEventsRequest = {
    container_ids: ['abc123', 'def456'],  // string[]
    event_types: ['started', 'stopped', 'failed']  // string[]
  };

  // Event is typed as ContainerEvent
  for await (const event of client.streamEvents(streamReq)) {
    // TypeScript knows all these properties:
    console.log({
      type: event.event_type,          // string
      container: event.container_id,    // string
      timestamp: new Date(event.timestamp * 1000), // Date
      attributes: event.attributes      // Record<string, string>
    });

    // Handle events with type safety
    if (event.event_type === 'failed') {
      // event.attributes is typed as Record<string, string>
      const errorMsg = event.attributes['error'] || 'Unknown error';
      await handleFailure(event);
    }
  }

  // Stream all events (no filters)
  for await (const event of client.streamEvents({})) {
    console.log('Event:', event.event_type);
  }
  `);
    // ═══════════════════════════════════════════════════════════════
    // 8. NETWORK OPERATIONS - Clear, explicit, and typed
    // ═══════════════════════════════════════════════════════════════
    console.log('8️⃣  NETWORK OPERATIONS (Type-Safe)\n');
    const allocations = await client.listNetworkAllocations({});
    console.log(`✓ Listed ${allocations.allocations?.length || 0} network allocations`);
    // allocations.allocations is typed as NetworkAllocation[]
    if (allocations.allocations) {
        for (const alloc of allocations.allocations) {
            console.log(`  ${alloc.container_id}: ${alloc.ip_address}`);
        }
    }
    const dnsEntries = await client.listDnsEntries({});
    console.log(`✓ Listed ${dnsEntries.entries?.length || 0} DNS entries`);
    console.log('\nSyntax patterns with type safety:');
    console.log(`
  // Get container network config - typed request and response
  const netReq: QuiltTypes.GetContainerNetworkRequest = {
    container_id: 'abc123'
  };
  const network: QuiltTypes.GetContainerNetworkResponse =
    await client.getContainerNetwork(netReq);

  // network.network_config is typed as ContainerNetworkConfig
  console.log({
    ip: network.network_config.ip_address,           // string
    bridge: network.network_config.bridge_interface, // string
    vethHost: network.network_config.veth_host,      // string
    vethContainer: network.network_config.veth_container, // string
    status: network.network_config.status            // string
  });

  // Set custom network config - fully typed request
  const networkConfig: QuiltTypes.ContainerNetworkConfig = {
    ip_address: '10.42.0.100',
    bridge_interface: 'quilt0',
    veth_host: 'veth0',
    veth_container: 'eth0',
    setup_completed: true,
    status: 'active'
  };

  const setNetReq: QuiltTypes.SetContainerNetworkRequest = {
    container_id: 'abc123',
    network_config: networkConfig
  };
  await client.setContainerNetwork(setNetReq);

  // Setup network post-start - typed request
  const setupNetReq: QuiltTypes.SetupContainerNetworkPostStartRequest = {
    container_id: 'abc123'
  };
  await client.setupContainerNetworkPostStart(setupNetReq);

  // DNS entries - typed response
  const dns: QuiltTypes.ListDnsEntriesResponse = await client.listDnsEntries({});
  // dns.entries is typed as DnsEntry[]
  for (const entry of dns.entries) {
    console.log(\`\${entry.container_name} -> \${entry.ip_address}\`);
  }
  `);
    console.log();
    // ═══════════════════════════════════════════════════════════════
    // 9. CLEANUP OPERATIONS - Task tracking with type safety
    // ═══════════════════════════════════════════════════════════════
    console.log('9️⃣  CLEANUP OPERATIONS (Type-Safe)\n');
    console.log('Syntax patterns with full type safety:');
    console.log(`
  // Get cleanup status for all containers - typed request
  const cleanupStatusReq: QuiltTypes.GetCleanupStatusRequest = {
    container_id: ''  // Empty = all containers
  };
  const status: QuiltTypes.GetCleanupStatusResponse =
    await client.getCleanupStatus(cleanupStatusReq);

  // status.tasks is typed as CleanupTask[]
  for (const task of status.tasks) {
    console.log({
      taskId: task.task_id,            // number
      containerId: task.container_id,  // string
      resourceType: task.resource_type, // string
      status: task.status,             // string
      createdAt: task.created_at       // number
    });
  }

  // List all cleanup tasks - typed response
  const allTasks: QuiltTypes.ListCleanupTasksResponse =
    await client.listCleanupTasks({});

  // Get specific task status - typed request
  const taskStatusReq: QuiltTypes.GetCleanupTaskStatusRequest = {
    task_id: 123
  };
  const taskStatus: QuiltTypes.GetCleanupTaskStatusResponse =
    await client.getCleanupTaskStatus(taskStatusReq);

  // List tasks for specific container - typed request
  const containerTasksReq: QuiltTypes.ListContainerCleanupTasksRequest = {
    container_id: 'abc123'
  };
  const containerTasks: QuiltTypes.ListContainerCleanupTasksResponse =
    await client.listContainerCleanupTasks(containerTasksReq);

  // Force cleanup - typed request and response
  const forceReq: QuiltTypes.ForceCleanupRequest = {
    container_id: 'abc123'
  };
  const result: QuiltTypes.ForceCleanupResponse =
    await client.forceCleanup(forceReq);

  // result.cleaned_resources is typed as string[]
  console.log('Cleaned:', result.cleaned_resources);

  // Comprehensive network cleanup (admin operation) - typed response
  const networkCleanup: QuiltTypes.ComprehensiveNetworkCleanupResponse =
    await client.comprehensiveNetworkCleanup({});

  console.log('Network resources cleaned:', networkCleanup.cleaned_resources);
  `);
    const cleanupTasks = await client.listCleanupTasks({});
    console.log(`✓ Listed ${cleanupTasks.tasks?.length || 0} cleanup tasks\n`);
    // ═══════════════════════════════════════════════════════════════
    // 10. ERROR HANDLING - Typed errors with full type safety
    // ═══════════════════════════════════════════════════════════════
    console.log('🔟 ERROR HANDLING (Type-Safe)\n');
    console.log('Syntax patterns with typed error classes:');
    console.log(`
  import {
    QuiltConnectionError,
    QuiltRPCError,
    QuiltServerError
  } from 'quilt-sdk';

  try {
    const createReq: QuiltTypes.CreateContainerRequest = {
      image_path: '/nonexistent.tar'
    };
    await client.createContainer(createReq);
  } catch (error) {
    if (error instanceof QuiltConnectionError) {
      // TypeScript knows error.serverAddress exists
      console.error('Cannot connect to:', error.serverAddress);
      // Retry or fail gracefully
    }
    else if (error instanceof QuiltRPCError) {
      // TypeScript knows all these properties exist
      console.error('RPC failed:', {
        method: error.method,      // string
        code: error.code,          // number
        details: error.details     // string | undefined
      });
      // Handle specific gRPC error codes
    }
    else if (error instanceof QuiltServerError) {
      // TypeScript knows error.message exists
      console.error('Server error:', error.message);
      // Server failed to start
    }
    else if (error instanceof Error) {
      // Generic error handling
      console.error('Unknown error:', error.message);
    }
  }
  `);
    // ═══════════════════════════════════════════════════════════════
    // 11. LOOKUP BY NAME - Convenient aliases with type safety
    // ═══════════════════════════════════════════════════════════════
    console.log('1️⃣1️⃣  LOOKUP BY NAME (Type-Safe)\n');
    console.log('Syntax pattern with full type safety:');
    console.log(`
  // Get container ID by name - typed request and response
  const lookupReq: QuiltTypes.GetContainerByNameRequest = {
    name: 'my-app'
  };
  const lookup: QuiltTypes.GetContainerByNameResponse =
    await client.getContainerByName(lookupReq);

  if (lookup.found) {
    const containerId: string = lookup.container_id;

    // Now use the ID for other operations
    const stopReq: QuiltTypes.StopContainerRequest = {
      container_id: containerId
    };
    await client.stopContainer(stopReq);
  }

  // OR use name directly in most operations
  await client.stopContainer({ container_name: 'my-app' });
  await client.getContainerStatus({ container_name: 'my-app' });
  await client.execContainer({
    container_name: 'my-app',
    command: ['ls', '-la']
  });
  `);
    // ═══════════════════════════════════════════════════════════════
    // SUMMARY
    // ═══════════════════════════════════════════════════════════════
    console.log('\n═══════════════════════════════════════════════════════');
    console.log('  TYPE SAFETY & SYNTAX HIGHLIGHTS');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`
  ✅ Clean async/await throughout
  ✅ ALL 31 methods are fully typed
  ✅ Request interfaces validate at compile time
  ✅ Response types provide perfect autocomplete
  ✅ Nested objects and arrays fully typed
  ✅ Enums for type-safe constants (MountType, ContainerStatus)
  ✅ Optional vs required parameters clearly marked
  ✅ Error classes with typed properties
  ✅ AsyncIterator properly typed for streaming
  ✅ Record<string, string> for maps
  ✅ Complex nested structures fully supported
  ✅ TypeScript catches typos at compile time
  ✅ Zero runtime type errors
  ✅ Full IDE autocomplete support
  ✅ Intellisense works everywhere
  `);
    // ═══════════════════════════════════════════════════════════════
    // DISCONNECT
    // ═══════════════════════════════════════════════════════════════
    console.log('Disconnecting...');
    await client.disconnect();
    console.log('✓ Disconnected cleanly\n');
}
// Run the demonstration
demonstrateSyntax().catch((error) => {
    console.error('Error:', error.message);
    process.exit(1);
});
