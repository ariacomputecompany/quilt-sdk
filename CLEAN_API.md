# Quilt SDK - Clean API

A streamlined, agent-friendly TypeScript client for the Quilt container runtime.

## Features

✅ **Single import** - One clean entry point
✅ **Short property names** - Idiomatic, minimal syntax
✅ **Smart defaults** - Async by default, namespaces enabled
✅ **Full type safety** - No `any` types anywhere
✅ **Dual naming support** - Short names + camelCase + snake_case
✅ **OpenAI tool schemas** - Ready for AI agents

## Installation

```bash
npm install quilt-sdk
```

## Quick Start

```typescript
import Quilt from 'quilt-sdk';

// One-line connect
const quilt = await Quilt.connect({ autoStart: true });

// Create a container - no image path needed!
await quilt.create({
  cmd: ['node', 'app.js'],
  env: { PORT: '3000' },
  workdir: '/app',
  memory: 512,
  cpu: 50,
  name: 'my-app'
});

// Start, stop, execute
await quilt.start({ name: 'my-app' });
const result = await quilt.exec({ name: 'my-app', cmd: ['npm', 'test'] });
await quilt.stop({ name: 'my-app' });

// Cleanup
await quilt.disconnect();
```

### Truly Minimal

```typescript
import Quilt from 'quilt-sdk';

const quilt = await Quilt.connect();

// Just specify what to run - that's it!
await quilt.create({
  cmd: ['python', 'script.py']
});

// Or even more minimal
await quilt.create({});  // Uses all defaults
```

## Property Name Aliases

The SDK accepts multiple naming styles and normalizes them internally:

| Short | CamelCase | Canonical (snake_case) |
|-------|-----------|------------------------|
| `image` | `imagePath` | `image_path` |
| `cmd` | `command` | `command` |
| `env` | `environment` | `environment` |
| `workdir` | `workingDirectory` | `working_directory` |
| `memory` | `memoryLimitMb` | `memory_limit_mb` |
| `cpu` | `cpuLimitPercent` | `cpu_limit_percent` |
| `id` | `containerId` | `container_id` |
| `name` | `containerName` | `container_name` |

**All three styles work** - use whichever is most natural!

## Smart Defaults

Optimized for agent use cases with sensible defaults:

```typescript
// These are automatically applied:
{
  image_path: '/var/lib/quilt/images/default.tar',  // Internal default image
  async_mode: true,                    // Non-blocking (agents can kill at any time)
  enable_pid_namespace: true,          // Process isolation
  enable_mount_namespace: true,        // Filesystem isolation
  enable_uts_namespace: true,          // Hostname isolation
  enable_ipc_namespace: true,          // IPC isolation
  enable_network_namespace: true,      // Network isolation
  capture_output: true,                // For exec commands
  timeout_seconds: 10,                 // For stop operations
}
```

This means **zero configuration** required:

```typescript
// Nothing is required - use all defaults!
await quilt.create({});

// Or just specify what to run
await quilt.create({ cmd: ['node', 'app.js'] });
```

## API Methods

### Container Operations

```typescript
// Create container (image is optional - uses internal default)
await quilt.create({ cmd, env, workdir, memory, cpu, name, ... });

// Lifecycle
await quilt.start({ id | name });
await quilt.stop({ id | name, timeout });
await quilt.kill({ id | name });
await quilt.remove({ id | name, force });

// Inspection
await quilt.status({ id | name });
await quilt.logs({ id | name });
await quilt.exec({ id | name, cmd, env, workdir, capture });

// Lookup
await quilt.find({ name });
```

### Volume Operations

```typescript
await quilt.createVolume({ name, driver, labels, options });
await quilt.removeVolume({ name, force });
await quilt.listVolumes({ filters });
await quilt.inspectVolume({ name });
```

### System Operations

```typescript
await quilt.health();
await quilt.metrics({ id, include });
await quilt.info();

// Streaming events
for await (const event of quilt.events({ containerIds, eventTypes })) {
  console.log('Event:', event.event_type);
}
```

### Network Operations

```typescript
await quilt.listNetworks();
await quilt.getNetwork({ id });
await quilt.setNetwork({ id, networkConfig });
await quilt.setupNetwork({ id });
await quilt.listDns();
```

### Monitoring Operations

```typescript
await quilt.listMonitors();
await quilt.monitorStatus({ id });
await quilt.monitorProcesses();
```

### Cleanup Operations

```typescript
await quilt.cleanup({ id });
await quilt.listCleanup();
await quilt.cleanupStatus({ taskId });
await quilt.containerCleanup({ id });
await quilt.forceCleanup({ id });
await quilt.networkCleanup();
```

## OpenAI Tool Integration

The SDK includes auto-generated OpenAI function calling schemas:

```typescript
import Quilt, { QUILT_TOOLS } from 'quilt-sdk';

// Initialize for agent use
const quilt = await Quilt.connect({ autoStart: true });

// Provide tools to OpenAI
const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Create a Node.js container' }],
  tools: QUILT_TOOLS
});

// Handle tool calls
const toolCall = completion.choices[0].message.tool_calls[0];
if (toolCall.function.name === 'create_container') {
  const args = JSON.parse(toolCall.function.arguments);
  const result = await quilt.create(args);
  console.log('Container created:', result.container_id);
}
```

## Type Safety

The SDK is fully type-safe with **zero `any` types**:

```typescript
import Quilt, { QuiltTypes } from 'quilt-sdk';

const quilt = await Quilt.connect();

// All requests are typed
const createRequest = {
  image: '/path/to/alpine.tar',
  cmd: ['node', 'app.js'],
  env: { PORT: '3000' },
  memory: 512
};

// All responses are typed
const result = await quilt.create(createRequest);
// TypeScript knows: result.container_id, result.success, result.error_message

// Type exports available
type CreateRequest = QuiltTypes.CreateContainerRequest;
type CreateResponse = QuiltTypes.CreateContainerResponse;
```

## Examples

See the `examples/` directory:

- `clean-api.ts` - Comprehensive clean API demonstration
- `typescript-example.ts` - Full type safety showcase
- `basic.js` - Simple usage example

## Architecture

```
src/
├── wrapper.ts          # Main Quilt class (replaces client.ts)
├── tools.ts            # OpenAI tool schemas
├── types.ts            # Type definitions and error classes
├── interfaces.ts       # Request/Response interfaces
├── server.ts           # Server manager
└── utils/
    ├── normalize.ts    # Property name normalization
    └── defaults.ts     # Smart default configurations
```

## Migration from Old API

If you were using `QuiltClient`, migration is simple:

**Before:**
```typescript
import { QuiltClient } from 'quilt-sdk';

const client = new QuiltClient({ autoStart: true });
await client.connect();

await client.createContainer({
  image_path: '/path/to/alpine.tar',
  command: ['node', 'app.js'],
  environment: { PORT: '3000' }
});
```

**After:**
```typescript
import Quilt from 'quilt-sdk';

const quilt = await Quilt.connect({ autoStart: true });

await quilt.create({
  image: '/path/to/alpine.tar',
  cmd: ['node', 'app.js'],
  env: { PORT: '3000' }
});
```

## License

MIT
