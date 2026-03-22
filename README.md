# quilt-sdk

Type-safe TypeScript SDK for Quilt production APIs.

`quilt-sdk` is the programmatic client for the live Quilt backend. It is intended to be the typed source of truth for production automation, not a thin convenience wrapper around ad hoc fetch calls.

## Install

```bash
npm install quilt-sdk
```

or

```bash
bun add quilt-sdk
```

## Requirements

- Node `>=20.10.0`
- Quilt backend URL, usually `https://backend.quilt.sh`
- either `QUILT_API_KEY` or `QUILT_JWT`

## Quick Start

```ts
import { QuiltClient } from "quilt-sdk";

const client = QuiltClient.connect({
  baseUrl: process.env.QUILT_BASE_URL ?? "https://backend.quilt.sh",
  apiKey: process.env.QUILT_API_KEY,
});

const health = await client.system.health();
const containers = await client.containers.list();

console.log(health.status);
console.log(containers.containers.length);
```

## Auth

`QuiltClient.connect()` accepts:

- `apiKey` for `X-Api-Key`
- `token` for bearer auth
- `auth` for the explicit auth union when you need to control the transport directly

If both `apiKey` and `token` are provided, API key auth wins.

## Core Client Shape

```ts
import { QuiltClient } from "quilt-sdk";

const client = QuiltClient.connect({
  baseUrl: "https://backend.quilt.sh",
  apiKey: process.env.QUILT_API_KEY,
});
```

Primary SDK surfaces:

- `client.system` for health, info, and activity
- `client.containers` for container lifecycle, exec, logs, metrics, snapshots, network, and GUI URLs
- `client.platform` for cross-cutting routes such as operations, env maps, archives, jobs, ICC, OCI, and helper control flows
- `client.volumes` for volume lifecycle and file browsing
- `client.clusters` for cluster, node, workload, placement, and join-token control-plane flows
- `client.agent` for join-token and node-token authenticated agent calls
- `client.functions` for serverless lifecycle, invoke, versions, invocations, and pool status
- `client.elasticity` for resize, pool targeting, and orchestrator-safe control actions
- `client.terminal` and `client.terminalRealtime` for terminal session lifecycle and WebSocket attach
- `client.events` for SSE streams
- `client.raw(...)` for authenticated access to backend routes that are intentionally still exposed as raw contract calls

## Public Types

The SDK ships declarations automatically.

Use the client-owned type surface when you need explicit types:

```ts
import { QuiltClient } from "quilt-sdk";

const client = QuiltClient.connect({
  apiKey: process.env.QUILT_API_KEY,
});

const options: QuiltClient.Options = {
  baseUrl: "https://backend.quilt.sh",
  apiKey: process.env.QUILT_API_KEY,
};

let invocation: QuiltClient.Functions.Invocation | null = null;
let resize: QuiltClient.Elasticity.ContainerResizeResponse | null = null;
```

That keeps consumer imports simple while still exposing the production contract.

## Execution Model

Use the SDK in the same execution style the backend expects:

- treat container lifecycle mutations as operation-driven when they return operation metadata
- treat exec as submit-and-track, not inline command execution
- use terminal attach and WebSocket flows for interactive sessions
- invoke a shell explicitly when shell parsing is required
- prefer typed module methods over `client.raw(...)`

## Realtime

### SSE

```ts
const source = client.events.openEventSource();
client.events.on(source, "container_update", (event) => {
  console.log(event.data);
});
```

### WebSocket Terminal

```ts
const ws = client.terminalRealtime.connect({
  container_identifier: "ctr_123",
  cols: 120,
  rows: 30,
});

ws.addEventListener("message", (msg) => {
  if (typeof msg.data === "string") {
    const parsed = client.terminalRealtime.parseServerMessage(msg.data);
    console.log(parsed);
  }
});
```

## Examples

The repo ships production-validated examples in [examples/README.md](/home/ubuntu/quilt-sdk/examples/README.md).

Example files:

- `examples/containers-volumes-and-network.ts`
- `examples/sdk-runtime-and-functions.ts`
- `examples/clusters-nodes-workloads-and-k8s.ts`
- `examples/terminal-and-icc.ts`
- `examples/elasticity-control.ts`
- `examples/lifecycle-and-failures.ts`

Run them from the repo root:

```bash
bun run example:containers
bun run example:sdk
bun run example:clusters
bun run example:terminal
bun run example:elasticity
bun run example:lifecycle
bun run examples:all
```

Expected environment variables:

```text
QUILT_BASE_URL=https://backend.quilt.sh
QUILT_API_KEY=<api_key>
```

Alternative auth:

```text
QUILT_JWT=<jwt>
```

## Repository Validation

```bash
bun run lint
bun run typecheck
bun run examples:typecheck
bun run test
bun run build
bun run examples:all
```

## License

MIT
