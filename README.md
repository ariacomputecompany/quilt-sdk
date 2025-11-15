# Quilt SDK

Type-safe TypeScript SDK for the [Quilt](https://github.com/anthropics/quilt) container runtime via HTTP API.

## Features

- **Full Type Safety**: TypeScript types for all API operations
- **31 HTTP API Methods**: Complete API coverage for container, volume, network, and cleanup operations
- **HTTP REST Client**: Clean HTTP-based communication with the Quilt server
- **Tool Schemas**: Generic JSON Schema definitions for AI framework integration
- **Zero Dependencies**: No external dependencies (uses built-in fetch)

## Installation

```bash
npm install quilt-sdk
```

**Note**: Requires Node.js 18+ for built-in `fetch` support.

## Quick Start

```typescript
import Quilt from 'quilt-sdk';

// Connect to Quilt HTTP API
const quilt = await Quilt.connect({
  apiBaseUrl: 'http://localhost:8080'
});

// Create a container
const result = await quilt.create({
  image_path: '/path/to/image.tar',
  name: 'my-container',
  command: ['/bin/sh', '-c', 'echo "Hello from Quilt!"'],
  environment: {
    NODE_ENV: 'production'
  },
  async_mode: true
});

console.log('Container ID:', result.container_id);

// Get container status
const status = await quilt.status({
  container_id: result.container_id
});

console.log('State:', status.state);
console.log('PID:', status.pid);
console.log('IP Address:', status.ip_address);

// Cleanup
await quilt.disconnect();
```

## Configuration

### QuiltClientOptions

```typescript
interface QuiltClientOptions {
  // API base URL (default: "http://localhost:8080")
  apiBaseUrl?: string;

  // Bearer token for authentication (optional)
  token?: string;

  // Timeout for HTTP requests in milliseconds (default: 30000)
  timeout?: number;
}
```

## API Reference

### Container Operations (9 methods)

#### createContainer(request)
Creates a new container with advanced features including namespaces, resource limits, and volume mounts.

```typescript
const result = await client.createContainer({
  image_path: '/path/to/image.tar',
  name: 'my-app',
  command: ['node', 'server.js'],
  environment: { PORT: '3000' },
  working_directory: '/app',
  memory_limit_mb: 512,
  cpu_limit_percent: 50.0,
  enable_network_namespace: true,
  async_mode: true,
  mounts: [
    {
      source: '/host/data',
      target: '/data',
      type: 'BIND',
      readonly: false
    }
  ]
});
```

#### startContainer(request)
Starts a stopped container.

```typescript
await client.startContainer({
  container_id: 'abc123'
  // or: container_name: 'my-app'
});
```

#### stopContainer(request)
Stops a running container gracefully.

```typescript
await client.stopContainer({
  container_id: 'abc123',
  timeout_seconds: 10
});
```

#### killContainer(request)
Kills a container immediately.

```typescript
await client.killContainer({
  container_id: 'abc123'
});
```

#### removeContainer(request)
Removes a container.

```typescript
await client.removeContainer({
  container_id: 'abc123',
  force: true
});
```

#### getContainerStatus(request)
Gets detailed status including CPU, memory, and network info.

```typescript
const status = await client.getContainerStatus({
  container_id: 'abc123'
});
console.log(status.status); // PENDING, RUNNING, EXITED, FAILED
console.log(status.memory_usage_bytes);
console.log(status.ip_address);
```

#### getContainerLogs(request)
Gets the logs of a container.

```typescript
const logs = await client.getContainerLogs({
  container_id: 'abc123'
});
for (const entry of logs.logs) {
  console.log(entry.timestamp, entry.message);
}
```

#### execContainer(request)
Executes a command in a running container.

```typescript
const result = await client.execContainer({
  container_id: 'abc123',
  command: ['ls', '-la', '/app'],
  capture_output: true
});
console.log(result.stdout);
console.log(result.exit_code);
```

#### getContainerByName(request)
Gets a container ID by its name.

```typescript
const result = await client.getContainerByName({
  name: 'my-app'
});
if (result.found) {
  console.log('Container ID:', result.container_id);
}
```

### Volume Management (4 methods)

#### createVolume(request)
Creates a new named volume.

```typescript
const volume = await client.createVolume({
  name: 'data-volume',
  driver: 'local',
  labels: { project: 'myapp' }
});
```

#### removeVolume(request)
Removes a named volume.

```typescript
await client.removeVolume({
  name: 'data-volume',
  force: false
});
```

#### listVolumes(request)
Lists all volumes.

```typescript
const result = await client.listVolumes({
  filters: { project: 'myapp' }
});
for (const volume of result.volumes) {
  console.log(volume.name, volume.mount_point);
}
```

#### inspectVolume(request)
Inspects a volume to get detailed information.

```typescript
const result = await client.inspectVolume({
  name: 'data-volume'
});
if (result.found) {
  console.log(result.volume);
}
```

### Health and Monitoring (4 methods)

#### getHealth(request?)
Gets the health status of the Quilt server.

```typescript
const health = await client.getHealth();
console.log(health.healthy);
console.log(health.uptime_seconds);
console.log(health.containers_running);
```

#### getMetrics(request)
Gets metrics for containers and system.

```typescript
const metrics = await client.getMetrics({
  container_id: 'abc123',
  include_system: true
});
for (const metric of metrics.container_metrics) {
  console.log('CPU:', metric.cpu_usage_usec);
  console.log('Memory:', metric.memory_current_bytes);
  console.log('Network RX:', metric.network_rx_bytes);
}
```

#### getSystemInfo(request?)
Gets system information.

```typescript
const info = await client.getSystemInfo();
console.log('Quilt Version:', info.version);
console.log('Runtime:', info.runtime);
```

#### streamEvents(request)
Streams container events in real-time (AsyncIterator).

```typescript
for await (const event of client.streamEvents({
  container_ids: [], // empty = all containers
  event_types: ['started', 'stopped', 'failed']
})) {
  console.log(event.event_type, event.container_id, event.timestamp);
}
```

### Container Monitoring (3 methods)

#### listActiveMonitors(request?)
Lists all active container monitors.

```typescript
const result = await client.listActiveMonitors();
```

#### getMonitorStatus(request)
Gets the status of a specific monitor.

```typescript
const result = await client.getMonitorStatus({
  container_id: 'abc123'
});
```

#### listMonitoringProcesses(request?)
Lists all monitoring processes.

```typescript
const result = await client.listMonitoringProcesses();
```

### Network Operations (4 methods)

#### listNetworkAllocations(request?)
Lists all network allocations.

```typescript
const result = await client.listNetworkAllocations();
for (const alloc of result.allocations) {
  console.log(alloc.container_id, alloc.ip_address);
}
```

#### getContainerNetwork(request)
Gets network configuration for a container.

```typescript
const result = await client.getContainerNetwork({
  container_id: 'abc123'
});
console.log(result.network_config.ip_address);
```

#### setContainerNetwork(request)
Sets network configuration for a container.

```typescript
await client.setContainerNetwork({
  container_id: 'abc123',
  network_config: {
    ip_address: '10.42.0.10',
    bridge_interface: 'quilt0'
  }
});
```

#### setupContainerNetworkPostStart(request)
Sets up container network after start.

```typescript
await client.setupContainerNetworkPostStart({
  container_id: 'abc123'
});
```

### DNS Operations (1 method)

#### listDnsEntries(request?)
Lists all DNS entries.

```typescript
const result = await client.listDnsEntries();
for (const entry of result.entries) {
  console.log(entry.container_name, entry.ip_address);
}
```

### Cleanup Operations (6 methods)

#### getCleanupStatus(request)
Gets cleanup status.

```typescript
const result = await client.getCleanupStatus({
  container_id: 'abc123' // or empty for all
});
```

#### listCleanupTasks(request?)
Lists all cleanup tasks.

```typescript
const result = await client.listCleanupTasks();
```

#### getCleanupTaskStatus(request)
Gets status of a specific cleanup task.

```typescript
const result = await client.getCleanupTaskStatus({
  task_id: 123
});
```

#### listContainerCleanupTasks(request)
Lists cleanup tasks for a container.

```typescript
const result = await client.listContainerCleanupTasks({
  container_id: 'abc123'
});
```

#### forceCleanup(request)
Forces cleanup of a container.

```typescript
const result = await client.forceCleanup({
  container_id: 'abc123'
});
console.log(result.cleaned_resources);
```

#### comprehensiveNetworkCleanup(request?)
Performs comprehensive network cleanup.

```typescript
const result = await client.comprehensiveNetworkCleanup();
console.log(result.cleaned_resources);
```

## Error Handling

The SDK throws specific error types for different failure scenarios:

```typescript
import {
  QuiltConnectionError,
  QuiltRPCError,
  QuiltServerError
} from 'quilt-sdk';

try {
  await client.createContainer({ /* ... */ });
} catch (error) {
  if (error instanceof QuiltConnectionError) {
    console.error('Connection failed:', error.serverAddress);
  } else if (error instanceof QuiltRPCError) {
    console.error('RPC failed:', error.method, error.code);
  } else if (error instanceof QuiltServerError) {
    console.error('Server error:', error.message);
  }
}
```

## Tool Schemas for AI Frameworks

The SDK exports Generic JSON Schema definitions for all methods:

```typescript
import { QUILT_TOOL_SCHEMAS, getToolSchema } from 'quilt-sdk';

// Get all schemas
console.log(QUILT_TOOL_SCHEMAS);

// Get specific schema
const schema = getToolSchema('CreateContainer');
console.log(schema.input_schema);
```

These schemas are compatible with AI frameworks that support tool calling (OpenAI, Anthropic, etc.).

## Development

### Build from Source

```bash
# Install dependencies
npm install

# Generate TypeScript from proto
npm run generate

# Build TypeScript
npm run build

# Run example
node examples/basic.js
```

### Project Structure

```
quilt-sdk/
├── src/
│   ├── index.ts       # Main export
│   ├── client.ts      # QuiltClient (31 methods)
│   ├── server.ts      # Server lifecycle management
│   ├── types.ts       # Type definitions
│   └── schemas.ts     # Tool schemas
├── proto/
│   └── quilt.proto    # gRPC service definition
├── bin/
│   └── quilt          # Quilt server binary
└── dist/              # Compiled output
```

## License

MIT OR Apache-2.0

## Contributing

Contributions are welcome! Please see the main [Quilt repository](https://github.com/anthropics/quilt) for guidelines.
