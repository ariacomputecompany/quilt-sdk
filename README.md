# Quilt SDK

TypeScript SDK for the Quilt container runtime HTTP API. Build secure, isolated execution environments for AI agents.

## Installation

```bash
npm install quilt-sdk
```

**Requirements**: Node.js 18+ (uses built-in `fetch`)

## Quick Start

```typescript
import Quilt from 'quilt-sdk';

// Connect to Quilt API
const quilt = await Quilt.connect({
  apiBaseUrl: 'https://api.quilt.run',  // Production endpoint
  token: process.env.QUILT_API_KEY       // Optional: Bearer token auth
});

// Create isolated container
const container = await quilt.create({
  image_path: '/var/lib/quilt/images/python.tar',
  command: ['python3', '-c', 'print("Hello from Quilt")'],
  memory_limit_mb: 512,
  async_mode: true
});

// Execute code
const result = await quilt.exec({
  container_id: container.container_id,
  command: ['python3', 'script.py'],
  capture_output: true
});

console.log(result.stdout);
console.log(result.exit_code);

// Cleanup
await quilt.remove({ container_id: container.container_id });
```

## Configuration

```typescript
interface QuiltClientOptions {
  apiBaseUrl?: string;  // Default: 'http://localhost:8080'
  token?: string;       // Bearer token for auth
  timeout?: number;     // Request timeout ms (default: 30000)
}
```

## Core Operations

### Container Lifecycle

```typescript
// Create container
const c = await quilt.create({
  image_path: '/var/lib/quilt/images/default.tar',
  name: 'worker-1',
  command: ['/bin/sh'],
  environment: { API_KEY: 'xxx' },
  memory_limit_mb: 1024,
  cpu_limit_percent: 50,
  volumes: ['/host/data:/container/data'],
  async_mode: true
});

// Start container
await quilt.start({ container_id: c.container_id });

// Get status
const status = await quilt.status({ container_id: c.container_id });
// Returns: { state: 'Running', pid: 1234, ip_address: '10.42.0.5', ... }

// Stop gracefully
await quilt.stop({ container_id: c.container_id });

// Force kill
await quilt.kill({ container_id: c.container_id });

// Remove
await quilt.remove({ container_id: c.container_id });

// List all containers
const containers = await quilt.list();
```

### Code Execution

```typescript
// Execute command in running container
const result = await quilt.exec({
  container_id: 'abc123',
  command: ['python3', '-c', 'import sys; print(sys.version)'],
  working_directory: '/app',
  capture_output: true
});

console.log('Exit Code:', result.exit_code);
console.log('Output:', result.stdout);
console.log('Errors:', result.stderr);
```

### Container Logs

```typescript
const logs = await quilt.logs({ container_id: 'abc123' });

for (const entry of logs.logs) {
  console.log(`[${entry.timestamp}] ${entry.message}`);
}
```

### Volume Management

```typescript
// Create persistent volume
await quilt.createVolume({
  name: 'data-vol',
  driver: 'local',
  labels: { project: 'agent-workspace' }
});

// List volumes
const volumes = await quilt.listVolumes();

// Inspect volume
const vol = await quilt.inspectVolume({ name: 'data-vol' });

// Remove volume
await quilt.removeVolume({ name: 'data-vol' });
```

### Monitoring & Metrics

```typescript
// Get container metrics
const metrics = await quilt.getMetrics({
  container_id: 'abc123',
  include_system: true
});

console.log('CPU Usage:', metrics.container_metrics[0].cpu_usage_usec);
console.log('Memory:', metrics.container_metrics[0].memory_current_bytes);
console.log('Network RX:', metrics.container_metrics[0].network_rx_bytes);

// System info
const info = await quilt.getSystemInfo();
console.log('Version:', info.version);
console.log('Features:', info.features);
```

### Network Operations

```typescript
// List network allocations
const allocations = await quilt.listNetworkAllocations();

// Get container network config
const network = await quilt.getContainerNetwork({
  container_id: 'abc123'
});
console.log('IP:', network.network_config.ip_address);

// Set IP address
await quilt.setContainerNetwork({
  container_id: 'abc123',
  network_config: { ip_address: '10.42.0.100' }
});

// DNS entries for inter-container communication
const dns = await quilt.listDNSEntries();
```

## AI Agent Tool Integration

### OpenAI Function Calling

```typescript
import Quilt from 'quilt-sdk';
import OpenAI from 'openai';

const quilt = await Quilt.connect({ apiBaseUrl: 'https://api.quilt.run' });
const openai = new OpenAI();

// Define tool for agent
const tools = [{
  type: "function",
  function: {
    name: "execute_python",
    description: "Execute Python code in isolated container",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string", description: "Python code to execute" }
      },
      required: ["code"]
    }
  }
}];

// Tool implementation
async function executePython(code: string) {
  const container = await quilt.create({
    image_path: '/var/lib/quilt/images/python.tar',
    async_mode: true,
    memory_limit_mb: 512
  });

  const result = await quilt.exec({
    container_id: container.container_id,
    command: ['python3', '-c', code],
    capture_output: true
  });

  await quilt.remove({ container_id: container.container_id });

  return {
    stdout: result.stdout,
    stderr: result.stderr,
    exit_code: result.exit_code
  };
}

// Agent conversation
const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "user", content: "Calculate fibonacci(10)" }],
  tools
});

// Execute tool call
if (response.choices[0].message.tool_calls) {
  const toolCall = response.choices[0].message.tool_calls[0];
  const args = JSON.parse(toolCall.function.arguments);
  const output = await executePython(args.code);
  console.log(output);
}
```

### Anthropic MCP Integration

```typescript
import Quilt from 'quilt-sdk';

const quilt = await Quilt.connect({ apiBaseUrl: 'https://api.quilt.run' });

// Export tool schemas for MCP
import { QUILT_TOOL_SCHEMAS } from 'quilt-sdk';

// MCP server provides these tools to Claude
const mcpTools = {
  "quilt_execute": {
    description: "Execute code in isolated container",
    inputSchema: QUILT_TOOL_SCHEMAS.CreateContainer.input_schema,
    handler: async (args: any) => {
      const container = await quilt.create(args);
      const result = await quilt.exec({
        container_id: container.container_id,
        command: args.command,
        capture_output: true
      });
      await quilt.remove({ container_id: container.container_id });
      return result;
    }
  }
};
```

## Production Use Cases

### 1. Code Sandbox for AI Agents

```typescript
// Agent executes user-provided code safely
async function runCodeSandbox(code: string, language: string) {
  const imageMap = {
    python: '/var/lib/quilt/images/python.tar',
    node: '/var/lib/quilt/images/node.tar',
    rust: '/var/lib/quilt/images/rust.tar'
  };

  const container = await quilt.create({
    image_path: imageMap[language],
    memory_limit_mb: 512,
    cpu_limit_percent: 25,
    async_mode: true
  });

  try {
    const result = await quilt.exec({
      container_id: container.container_id,
      command: [language === 'python' ? 'python3' : language, '-c', code],
      capture_output: true
    });

    return {
      success: result.exit_code === 0,
      output: result.stdout,
      error: result.stderr
    };
  } finally {
    await quilt.remove({ container_id: container.container_id });
  }
}
```

### 2. Data Processing Pipeline

```typescript
// Agent processes CSV data in isolated environment
async function processData(csvPath: string, script: string) {
  // Create volume for data
  await quilt.createVolume({ name: 'data-vol' });

  const container = await quilt.create({
    image_path: '/var/lib/quilt/images/python-data.tar',
    volumes: [`${csvPath}:/data/input.csv`, 'data-vol:/data/output'],
    memory_limit_mb: 2048,
    async_mode: true
  });

  await quilt.exec({
    container_id: container.container_id,
    command: ['python3', '/data/process.py'],
    working_directory: '/data',
    capture_output: true
  });

  const logs = await quilt.logs({ container_id: container.container_id });

  await quilt.remove({ container_id: container.container_id });
  await quilt.removeVolume({ name: 'data-vol' });

  return logs;
}
```

### 3. Multi-Container Agent Workflow

```typescript
// Agent orchestrates multiple containers with networking
async function runDistributedTask() {
  // Create worker containers
  const workers = await Promise.all([
    quilt.create({ name: 'worker-1', async_mode: true }),
    quilt.create({ name: 'worker-2', async_mode: true }),
    quilt.create({ name: 'worker-3', async_mode: true })
  ]);

  // Get network info for inter-container communication
  const dns = await quilt.listDNSEntries();
  console.log('Worker IPs:', dns.entries.map(e => `${e.name}: ${e.ip_address}`));

  // Execute parallel tasks
  const results = await Promise.all(
    workers.map(w => quilt.exec({
      container_id: w.container_id,
      command: ['./process_chunk.sh'],
      capture_output: true
    }))
  );

  // Cleanup
  await Promise.all(workers.map(w => quilt.remove({ container_id: w.container_id })));

  return results;
}
```

### 4. Long-Running Agent Services

```typescript
// Agent maintains persistent service container
async function deployAgentService() {
  const container = await quilt.create({
    name: 'agent-api',
    image_path: '/var/lib/quilt/images/node-api.tar',
    command: ['node', 'server.js'],
    environment: {
      PORT: '3000',
      NODE_ENV: 'production'
    },
    memory_limit_mb: 1024,
    async_mode: true
  });

  // Get assigned IP
  const network = await quilt.getContainerNetwork({
    container_id: container.container_id
  });

  console.log(`Service running at http://${network.network_config.ip_address}:3000`);

  // Monitor service
  setInterval(async () => {
    const status = await quilt.status({ container_id: container.container_id });
    const metrics = await quilt.getMetrics({ container_id: container.container_id });

    console.log('Status:', status.state);
    console.log('Memory:', metrics.container_metrics[0].memory_current_bytes);
  }, 30000);

  return container;
}
```

## Error Handling

```typescript
import { QuiltConnectionError, QuiltApiError } from 'quilt-sdk';

try {
  const container = await quilt.create({ /* ... */ });
} catch (error) {
  if (error instanceof QuiltConnectionError) {
    console.error('Failed to connect to Quilt API:', error.apiBaseUrl);
  } else if (error instanceof QuiltApiError) {
    console.error(`API error in ${error.method}:`, error.message);
    console.error('Status code:', error.statusCode);
    console.error('Details:', error.details);
  }
}
```

## API Methods Reference

### Container Operations (9)
- `create(params)` - Create container
- `start(params)` - Start container
- `stop(params)` - Stop container gracefully
- `kill(params)` - Force kill container
- `remove(params)` - Remove container
- `status(params)` - Get container status
- `list()` - List all containers
- `logs(params)` - Get container logs
- `exec(params)` - Execute command
- `getContainerByName(params)` - Lookup by name

### Volume Operations (4)
- `createVolume(params)` - Create volume
- `removeVolume(params)` - Remove volume
- `listVolumes()` - List volumes
- `inspectVolume(params)` - Inspect volume

### Health & System (3)
- `health()` - Server health check
- `getMetrics(params)` - Container/system metrics
- `getSystemInfo()` - System information

### Monitoring (3)
- `listMonitors()` - List active monitors
- `getMonitorStatus(params)` - Get monitor status
- `listMonitoringProcesses()` - List monitoring processes

### Network (4)
- `listNetworkAllocations()` - List network allocations
- `getContainerNetwork(params)` - Get network config
- `setContainerNetwork(params)` - Set network config
- `setupContainerNetworkPostStart(params)` - Setup network

### DNS (1)
- `listDNSEntries()` - List DNS entries

### Cleanup (6)
- `getCleanupStatus()` - Cleanup status
- `listCleanupTasks()` - List cleanup tasks
- `getCleanupTaskStatus(params)` - Task status
- `listContainerCleanupTasks(params)` - Container cleanup tasks
- `forceCleanupContainer(params)` - Force cleanup
- `comprehensiveNetworkCleanup(params)` - Network cleanup

## TypeScript Types

Full TypeScript definitions included:

```typescript
import { QuiltTypes } from 'quilt-sdk';

const request: QuiltTypes.CreateContainerRequest = {
  image_path: '/path/to/image.tar',
  command: ['python3', 'app.py'],
  environment: { KEY: 'value' },
  memory_limit_mb: 512
};
```

## License

MIT

## Links

- **Documentation**: https://docs.quilt.run
- **API Reference**: https://api.quilt.run/docs
- **GitHub**: https://github.com/saint0x/quilt-sdk-prod
- **Issues**: https://github.com/saint0x/quilt-sdk-prod/issues
