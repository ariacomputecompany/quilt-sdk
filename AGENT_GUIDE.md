# Quilt SDK - Agent Integration Guide

Quick reference for AI agents using the Quilt container runtime.

## What's Included

Every container automatically includes **300+ busybox utilities**:

### Core Utilities
- **Shells**: `sh`, `bash`
- **File Operations**: `ls`, `cat`, `cp`, `mv`, `rm`, `find`, `grep`
- **Text Processing**: `awk`, `sed`, `cut`, `sort`, `uniq`, `wc`
- **Network**: `wget`, `curl`, `ping`, `nc`, `telnet`
- **Compression**: `tar`, `gzip`, `gunzip`, `zip`, `unzip`
- **System**: `ps`, `top`, `kill`, `df`, `du`, `free`

## Quick Start

```typescript
import Quilt, { QUILT_TOOLS } from 'quilt-sdk';

const quilt = await Quilt.connect();

// Create container - no image needed!
await quilt.create({
  cmd: ['/bin/sh', '-c', 'echo hello']
});
```

## Zero Configuration Required

Agents don't need to specify:
- ❌ Image paths (handled automatically)
- ❌ Namespace settings (all enabled)
- ❌ Async mode (non-blocking by default)
- ❌ Available utilities (busybox included)

## Key Operations

### Create Container
```typescript
// Minimal
await quilt.create({
  cmd: ['/bin/sh', '-c', 'ls -la']
});

// With resources
await quilt.create({
  cmd: ['python', 'script.py'],
  env: { DATA: 'input.csv' },
  memory: 512,  // MB
  cpu: 50       // percent
});
```

### Execute Commands
```typescript
// Shell commands
const result = await quilt.exec({
  id: 'container-id',
  cmd: ['/bin/sh', '-c', 'grep pattern file.txt']
});

// Busybox utilities
await quilt.exec({
  name: 'my-app',
  cmd: ['wget', '-O', 'data.json', 'https://api.example.com']
});
```

### Monitor & Manage
```typescript
// Check status
const status = await quilt.status({ name: 'my-app' });
// status: PENDING=0, RUNNING=1, EXITED=2, FAILED=3

// Get logs
const logs = await quilt.logs({ id: 'container-id' });

// Cleanup
await quilt.stop({ name: 'my-app' });
await quilt.remove({ name: 'my-app' });
```

## OpenAI Function Calling

All 26 tools available with comprehensive descriptions:

```typescript
import { QUILT_TOOLS } from 'quilt-sdk';

// Use in OpenAI API
const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [{ role: 'user', content: 'Run a data analysis task' }],
  tools: QUILT_TOOLS
});
```

### Example Tool Call

```json
{
  "function": "create_container",
  "arguments": {
    "cmd": ["/bin/sh", "-c", "wget -O data.csv https://example.com/data && grep pattern data.csv"],
    "env": { "OUTPUT_DIR": "/tmp" },
    "memory": 256,
    "name": "analyzer"
  }
}
```

## Tool Categories

### Container Operations (9 tools)
- `create_container` - Create isolated container
- `start_container` - Start stopped container
- `stop_container` - Graceful shutdown (10s grace)
- `kill_container` - Immediate termination
- `remove_container` - Delete and cleanup
- `get_container_status` - State, PID, exit code, memory, IP
- `get_container_logs` - Retrieve stdout/stderr
- `exec_container` - Run commands, get output
- `find_container` - Lookup ID by name

### Volume Operations (4 tools)
- `create_volume` - Persistent storage
- `remove_volume` - Delete volume data
- `list_volumes` - List with label filters
- `inspect_volume` - Details and metadata

### System Operations (3 tools)
- `get_health` - Runtime health check
- `get_metrics` - CPU, memory, network, disk I/O
- `get_system_info` - Version, platform, features

### Network Operations (4 tools)
- `list_network_allocations` - Container IPs
- `get_container_network` - Network config
- `set_container_network` - Configure networking
- `list_dns_entries` - Name-to-IP mappings

### Monitoring (2 tools)
- `list_monitors` - Active process monitors
- `get_monitor_status` - Monitor health

### Cleanup (4 tools)
- `get_cleanup_status` - Task status
- `list_cleanup_tasks` - All cleanup operations
- `force_cleanup` - Emergency cleanup
- `network_cleanup` - Network resource cleanup

## Property Aliases

Use whichever style is natural:

| Short | CamelCase | Canonical |
|-------|-----------|-----------|
| `cmd` | `command` | `command` |
| `env` | `environment` | `environment` |
| `workdir` | `workingDirectory` | `working_directory` |
| `memory` | `memoryLimitMb` | `memory_limit_mb` |
| `cpu` | `cpuLimitPercent` | `cpu_limit_percent` |
| `id` | `containerId` | `container_id` |

## Smart Defaults

Applied automatically to every container:

```typescript
{
  image_path: '/var/lib/quilt/images/default.tar',
  async_mode: true,                    // Non-blocking
  enable_pid_namespace: true,          // Process isolation
  enable_mount_namespace: true,        // Filesystem isolation
  enable_uts_namespace: true,          // Hostname isolation
  enable_ipc_namespace: true,          // IPC isolation
  enable_network_namespace: true,      // Network isolation
  capture_output: true,                // For exec
  timeout_seconds: 10,                 // For stop
}
```

## Best Practices for Agents

### 1. Use Async Mode (Default)
Containers run non-blocking - agents can continue immediately:
```typescript
await quilt.create({ cmd: ['long-running-task'] });
// Agent continues immediately, container runs in background
```

### 2. Leverage Busybox Utilities
No need to install tools:
```typescript
await quilt.exec({
  id: 'container-id',
  cmd: ['/bin/sh', '-c', `
    wget -O data.json https://api.example.com &&
    cat data.json | grep pattern | wc -l
  `]
});
```

### 3. Use Names for Easy Reference
```typescript
await quilt.create({ cmd: ['task'], name: 'analyzer' });
await quilt.status({ name: 'analyzer' });
await quilt.logs({ name: 'analyzer' });
await quilt.remove({ name: 'analyzer' });
```

### 4. Monitor Status
Check if task completed:
```typescript
const status = await quilt.status({ name: 'task' });
if (status.status === 2) {  // EXITED
  const logs = await quilt.logs({ name: 'task' });
  console.log('Exit code:', status.exit_code);
  console.log('Output:', logs.logs);
}
```

### 5. Cleanup Resources
Always cleanup when done:
```typescript
await quilt.stop({ name: 'task' });
await quilt.remove({ name: 'task' });
```

## Error Handling

Three error types with specific properties:

```typescript
import { QuiltConnectionError, QuiltRPCError, QuiltServerError } from 'quilt-sdk';

try {
  await quilt.create({ cmd: ['task'] });
} catch (error) {
  if (error instanceof QuiltConnectionError) {
    // Server unreachable: error.serverAddress
  } else if (error instanceof QuiltRPCError) {
    // API call failed: error.method, error.code, error.details
  } else if (error instanceof QuiltServerError) {
    // Server failed to start: error.message
  }
}
```

## Container Lifecycle States

```
PENDING (0)  → Container created, not started
RUNNING (1)  → Container executing
EXITED (2)   → Container completed (check exit_code)
FAILED (3)   → Container failed to start/run
```

## Common Patterns

### Data Processing Pipeline
```typescript
// 1. Fetch data
await quilt.create({
  cmd: ['wget', '-O', '/data/input.csv', 'https://source.com/data'],
  name: 'fetcher'
});

// 2. Process data
await quilt.create({
  cmd: ['/bin/sh', '-c', 'grep pattern /data/input.csv > /data/output.csv'],
  name: 'processor'
});

// 3. Get results
const logs = await quilt.logs({ name: 'processor' });
```

### File Operations
```typescript
// Read file
await quilt.exec({
  id: 'container-id',
  cmd: ['cat', '/path/to/file.txt']
});

// Search in files
await quilt.exec({
  id: 'container-id',
  cmd: ['grep', '-r', 'pattern', '/path/']
});

// List directory
await quilt.exec({
  id: 'container-id',
  cmd: ['ls', '-lah', '/path/']
});
```

### Network Operations
```typescript
// Download file
await quilt.exec({
  id: 'container-id',
  cmd: ['wget', '-O', 'output.json', 'https://api.example.com/data']
});

// Test connectivity
await quilt.exec({
  id: 'container-id',
  cmd: ['ping', '-c', '4', 'example.com']
});
```

## Summary

**Minimum to create container**: `await quilt.create({})`

**What agents get**:
- ✅ 300+ busybox utilities
- ✅ Automatic image handling
- ✅ Non-blocking execution
- ✅ Full isolation
- ✅ Network connectivity
- ✅ 26 type-safe operations

**What agents focus on**:
- What command to run
- What environment variables needed
- What resources required (optional)

No infrastructure concerns. Just tasks.
