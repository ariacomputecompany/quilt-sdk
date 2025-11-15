/**
 * TypeScript Example - Full Type Safety Demonstration
 *
 * This example showcases the clean, intuitive, and FULLY TYPE-SAFE API
 * of the Quilt SDK when used in TypeScript.
 */

import {
  QuiltClient,
  QuiltTypes,
  QuiltConnectionError,
  QuiltRPCError,
  QuiltServerError,
  QUILT_TOOL_SCHEMAS
} from '../dist/index';

async function main(): Promise<void> {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Quilt SDK - TypeScript Type Safety Demonstration');
  console.log('═══════════════════════════════════════════════════════\n');

  // ═══════════════════════════════════════════════════════════════
  // 1. CLIENT INITIALIZATION - Fully typed options
  // ═══════════════════════════════════════════════════════════════
  console.log('1️⃣  CLIENT INITIALIZATION (Fully Typed)\n');

  const client = new QuiltClient({
    autoStart: true,                    // boolean
    serverAddress: '127.0.0.1:50051',   // string
    startupTimeoutMs: 5000,             // number
    shutdownTimeoutMs: 3000             // number
  });

  await client.connect();
  console.log('✓ Client connected with type-safe options\n');

  // ═══════════════════════════════════════════════════════════════
  // 2. HEALTH CHECK - Typed response
  // ═══════════════════════════════════════════════════════════════
  console.log('2️⃣  HEALTH CHECK (Typed Response)\n');

  const health: QuiltTypes.GetHealthResponse = await client.getHealth();

  // TypeScript knows all these properties exist and their types!
  console.log('Health Status:', {
    healthy: health.healthy,                    // boolean
    status: health.status,                      // string
    uptime: health.uptime_seconds,              // number
    containers_running: health.containers_running, // number
    containers_total: health.containers_total,     // number
    checks: health.checks                       // HealthCheck[]
  });

  // TypeScript autocomplete works for nested objects
  if (health.checks && health.checks.length > 0) {
    for (const check of health.checks) {
      console.log(`  - ${check.name}: ${check.healthy ? '✓' : '✗'} (${check.duration_ms}ms)`);
    }
  }
  console.log();

  // ═══════════════════════════════════════════════════════════════
  // 3. SYSTEM INFO - Enum types
  // ═══════════════════════════════════════════════════════════════
  console.log('3️⃣  SYSTEM INFO (With Enum Types)\n');

  const systemInfo: QuiltTypes.GetSystemInfoResponse = await client.getSystemInfo();
  console.log('System:', {
    version: systemInfo.version,      // string
    runtime: systemInfo.runtime,      // string
    start_time: systemInfo.start_time,   // number
    features: systemInfo.features,    // Record<string, string>
    limits: systemInfo.limits         // Record<string, string>
  });
  console.log();

  // ═══════════════════════════════════════════════════════════════
  // 4. CONTAINER CREATION - Rich typed request
  // ═══════════════════════════════════════════════════════════════
  console.log('4️⃣  CONTAINER CREATION (Fully Typed Request)\n');

  // TypeScript validates all properties and their types
  const createRequest: QuiltTypes.CreateContainerRequest = {
    image_path: '/path/to/alpine.tar',
    name: 'typescript-demo',
    command: ['node', 'server.js'],               // string[]
    working_directory: '/app',                     // string

    // Typed object
    environment: {
      NODE_ENV: 'production',
      PORT: '3000'
    },

    // Numbers with proper types
    memory_limit_mb: 512,                         // number
    cpu_limit_percent: 50.0,                      // number

    // Boolean flags
    enable_pid_namespace: true,                   // boolean
    enable_network_namespace: true,               // boolean
    async_mode: true,                             // boolean

    // Array of typed objects
    mounts: [
      {
        source: '/host/data',
        target: '/app/data',
        type: QuiltTypes.MountType.BIND,          // Enum!
        readonly: false,
        options: { 'bind-propagation': 'shared' }
      }
    ],

    setup_commands: ['npm: express', 'pip: requests']
  };

  console.log('Request validated by TypeScript at compile time ✓');
  console.log('(Skipping actual creation for demo)\n');

  // Response is also fully typed
  // const result: QuiltTypes.CreateContainerResponse = await client.createContainer(createRequest);
  // TypeScript knows: result.container_id (string), result.success (boolean), etc.

  // ═══════════════════════════════════════════════════════════════
  // 5. METRICS - Complex nested types
  // ═══════════════════════════════════════════════════════════════
  console.log('5️⃣  METRICS (Complex Nested Types)\n');

  const metricsRequest: QuiltTypes.GetMetricsRequest = {
    include_system: true,
    // container_id is optional, TypeScript knows this
  };

  const metrics: QuiltTypes.GetMetricsResponse = await client.getMetrics(metricsRequest);

  // TypeScript knows metrics.container_metrics is ContainerMetric[]
  console.log(`Container metrics: ${metrics.container_metrics?.length || 0} entries`);

  // All properties are typed, autocomplete works perfectly
  if (metrics.system_metrics) {
    const sys: QuiltTypes.SystemMetrics = metrics.system_metrics;
    console.log('System Metrics:', {
      memory: `${sys.memory_used_mb}/${sys.memory_total_mb}MB`,
      cpus: sys.cpu_count,
      load: sys.load_average,
      containers: {
        total: sys.containers_total,
        running: sys.containers_running,
        stopped: sys.containers_stopped
      }
    });
  }
  console.log();

  // ═══════════════════════════════════════════════════════════════
  // 6. VOLUMES - CRUD with full type safety
  // ═══════════════════════════════════════════════════════════════
  console.log('6️⃣  VOLUMES (Type-Safe CRUD)\n');

  const volumesResponse: QuiltTypes.ListVolumesResponse = await client.listVolumes({
    filters: { app: 'myapp' }  // Record<string, string>
  });

  console.log(`Found ${volumesResponse.volumes?.length || 0} volumes`);

  // Each volume is fully typed
  for (const volume of volumesResponse.volumes || []) {
    // TypeScript knows: volume.name, volume.driver, volume.mount_point, etc.
    console.log(`  - ${volume.name}: ${volume.mount_point}`);
  }
  console.log();

  // ═══════════════════════════════════════════════════════════════
  // 7. STREAMING - AsyncIterator with typed events
  // ═══════════════════════════════════════════════════════════════
  console.log('7️⃣  STREAMING (Typed AsyncIterator)\n');

  console.log('Event streaming pattern:');
  console.log(`
  // Request is typed
  const request: QuiltTypes.StreamEventsRequest = {
    container_ids: ['abc123'],
    event_types: ['started', 'stopped']
  };

  // Events are typed as ContainerEvent
  for await (const event of client.streamEvents(request)) {
    // TypeScript knows all properties:
    console.log({
      type: event.event_type,          // string
      container: event.container_id,    // string
      timestamp: event.timestamp,       // number
      attributes: event.attributes      // Record<string, string>
    });
  }
  `);

  // ═══════════════════════════════════════════════════════════════
  // 8. NETWORK OPERATIONS - Nested object types
  // ═══════════════════════════════════════════════════════════════
  console.log('8️⃣  NETWORK OPERATIONS (Nested Types)\n');

  const allocations: QuiltTypes.ListNetworkAllocationsResponse =
    await client.listNetworkAllocations({});

  console.log(`Network allocations: ${allocations.allocations?.length || 0}`);

  // Each allocation is a NetworkAllocation type
  for (const alloc of allocations.allocations || []) {
    console.log(`  Container ${alloc.container_id}: ${alloc.ip_address}`);
  }

  const dnsEntries: QuiltTypes.ListDnsEntriesResponse = await client.listDnsEntries({});
  console.log(`DNS entries: ${dnsEntries.entries?.length || 0}`);
  console.log();

  // Example of setting network config with full type safety
  console.log('Network config type safety:');
  console.log(`
  const networkConfig: QuiltTypes.ContainerNetworkConfig = {
    ip_address: '10.42.0.100',
    bridge_interface: 'quilt0',
    veth_host: 'veth0',
    veth_container: 'eth0',
    setup_completed: true,
    status: 'active'
  };

  const setNetworkRequest: QuiltTypes.SetContainerNetworkRequest = {
    container_id: 'abc123',
    network_config: networkConfig
  };

  const response: QuiltTypes.SetContainerNetworkResponse =
    await client.setContainerNetwork(setNetworkRequest);
  `);

  // ═══════════════════════════════════════════════════════════════
  // 9. ERROR HANDLING - Typed error classes
  // ═══════════════════════════════════════════════════════════════
  console.log('9️⃣  ERROR HANDLING (Typed Errors)\n');

  console.log('Type-safe error handling:');
  console.log(`
  try {
    await client.createContainer({
      image_path: '/nonexistent.tar'
    });
  } catch (error) {
    if (error instanceof QuiltConnectionError) {
      // TypeScript knows: error.serverAddress
      console.error('Connection failed:', error.serverAddress);
    }
    else if (error instanceof QuiltRPCError) {
      // TypeScript knows: error.method, error.code, error.details
      console.error('RPC error:', {
        method: error.method,
        code: error.code,
        details: error.details
      });
    }
    else if (error instanceof QuiltServerError) {
      // TypeScript knows: error.message
      console.error('Server error:', error.message);
    }
  }
  `);

  // ═══════════════════════════════════════════════════════════════
  // 10. TYPE EXPORTS - All types are accessible
  // ═══════════════════════════════════════════════════════════════
  console.log('🔟 TYPE EXPORTS (All Types Accessible)\n');

  console.log('Available type exports:');
  console.log(`
  // Request/Response types for all 31 methods
  import { QuiltTypes } from 'quilt-sdk';

  QuiltTypes.CreateContainerRequest
  QuiltTypes.CreateContainerResponse
  QuiltTypes.GetContainerStatusRequest
  QuiltTypes.GetContainerStatusResponse
  // ... all 31 methods with request/response types

  // Common types
  QuiltTypes.Mount
  QuiltTypes.Volume
  QuiltTypes.ContainerMetric
  QuiltTypes.SystemMetrics
  QuiltTypes.NetworkAllocation
  QuiltTypes.ContainerNetworkConfig
  QuiltTypes.ContainerEvent
  // ... and more

  // Enums
  QuiltTypes.ContainerStatus
  QuiltTypes.MountType

  // Error classes
  import {
    QuiltConnectionError,
    QuiltRPCError,
    QuiltServerError
  } from 'quilt-sdk';

  // Tool schemas
  import { QUILT_TOOL_SCHEMAS } from 'quilt-sdk';
  `);

  // ═══════════════════════════════════════════════════════════════
  // 11. OPTIONAL PARAMETERS - Type-safe defaults
  // ═══════════════════════════════════════════════════════════════
  console.log('1️⃣1️⃣  OPTIONAL PARAMETERS (Type-Safe Defaults)\n');

  console.log('Methods with optional parameters:');
  console.log(`
  // Empty request (all fields optional)
  await client.getHealth();
  await client.getSystemInfo();
  await client.listVolumes();
  await client.listNetworkAllocations();

  // Partial requests (TypeScript validates what you provide)
  await client.getContainerStatus({ container_id: 'abc' });
  await client.getContainerStatus({ container_name: 'my-app' });

  // Complex optional fields
  await client.createContainer({
    image_path: '/path/to/image.tar',  // Required
    name: 'optional-name',             // Optional
    memory_limit_mb: 512,              // Optional
    // ... TypeScript knows which are required vs optional
  });
  `);

  // ═══════════════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════════════
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('  TYPE SAFETY HIGHLIGHTS');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log(`
  ✅ All 31 methods are fully typed
  ✅ Request interfaces validate at compile time
  ✅ Response types provide autocomplete
  ✅ Nested objects and arrays fully typed
  ✅ Enums for type-safe constants
  ✅ Optional vs required parameters clearly marked
  ✅ Error classes with typed properties
  ✅ AsyncIterator properly typed for streaming
  ✅ Record<string, string> for maps
  ✅ Complex nested structures fully supported
  ✅ TypeScript autocomplete works everywhere
  ✅ Catch typos at compile time, not runtime
  `);

  await client.disconnect();
  console.log('✓ Disconnected\n');
}

main().catch((error: Error) => {
  console.error('Error:', error.message);
  process.exit(1);
});
