# Quilt SDK Examples

This directory is the programmatic example guide for `quilt-sdk`.

The files here are not throwaway smoke scripts. Each example exercises a real production flow through the official SDK and is meant to stay aligned with the live backend contract.

## Purpose

Use these examples when you need to:

- create or inspect containers programmatically
- run exec jobs and follow async operations
- manage volumes, archives, and network state
- drive clusters, nodes, workloads, and Kubernetes compatibility flows
- use terminal attach and ICC messaging
- use elasticity and control-plane resize or placement APIs
- manage serverless functions and invocation flows
- understand how the higher-level SDK modules map to backend resources

## Prerequisites

Expected environment variables:

```text
QUILT_BASE_URL=https://backend.quilt.sh
QUILT_API_KEY=<api_key>
```

Alternative auth:

```text
QUILT_JWT=<jwt>
```

Run examples from the repo root:

```bash
bun run example:containers
bun run example:images
bun run example:sdk
bun run example:clusters
bun run example:terminal
bun run example:elasticity
bun run example:lifecycle
bun run examples:all
```

## Client Model

All programmatic flows in this directory go through `quilt-sdk`.

Core client shape:

```ts
import { QuiltClient } from "quilt-sdk";

const client = QuiltClient.connect({
  baseUrl: process.env.QUILT_BASE_URL,
  apiKey: process.env.QUILT_API_KEY,
});
```

The SDK is organized around major platform surfaces:

- `client.system` for health, info, and activity
- `client.containers` for runtime lifecycle, exec, logs, metrics, snapshots, network, and GUI URLs
- `client.platform` for cross-cutting surfaces such as operations, environment maps, archives, ICC, OCI, and helper control flows
- `client.volumes` for volume lifecycle and file browsing
- `client.clusters` for cluster, node, workload, placement, and join-token control-plane flows
- `client.agent` for join-token and node-token authenticated agent calls
- `client.functions` for serverless lifecycle, invoke, versions, and pool status
- `client.elasticity` for resize, pool targeting, and orchestrator-safe control actions
- `client.terminal` and `client.terminalRealtime` for terminal session lifecycle and WebSocket attach
- `client.events` for SSE streams
- `client.raw(...)` for authenticated access to backend routes that are still intentionally exposed as raw contract calls

## File Map

### `containers-volumes-and-network.ts`

Use this for:

- health and SSE readiness
- container create, lookup, readiness, env updates, exec, jobs, and processes
- snapshots, clone, and fork
- volume create, file I/O, and archive upload
- container archive upload
- network, diagnostics, egress, monitors, DNS, cleanup, GUI, ICC, and functions

Primary SDK surfaces:

- `client.system`
- `client.containers`
- `client.platform`
- `client.volumes`
- `client.functions`

### `docker-and-oci-images.ts`

Use this for Docker-compatible registry image flows.

It covers:

- OCI image pull from a Docker-compatible registry
- OCI image list, inspect, and history
- container create from a pulled OCI image with `oci: true`
- exec inside the created container to confirm the pulled image is runnable

Primary SDK surfaces:

- `client.platform`
- `client.containers`

Registry pull snippet:

```ts
const pulled = await client.platform.ociPull({
  reference: "docker.io/library/alpine:3.20",
});
```

Create from the pulled image:

```ts
const accepted = await client.containers.create(
  {
    name: "oci-demo",
    image: "docker.io/library/alpine:3.20",
    oci: true,
    command: ["sleep", "60"],
  },
  "async",
);
```

### `sdk-runtime-and-functions.ts`

Use this as the smallest end-to-end SDK walkthrough.

It covers:

- client construction
- container lifecycle and readiness
- env mutation
- exec jobs
- volume file operations
- function create, deploy, invoke, version, and pool reads
- authenticated `client.raw(...)`

Primary SDK surfaces:

- `client.system`
- `client.containers`
- `client.platform`
- `client.volumes`
- `client.functions`

### `clusters-nodes-workloads-and-k8s.ts`

Use this for control-plane automation.

It covers:

- cluster create, list, get, capabilities, and reconcile
- join-token issuance
- node registration, heartbeat, allocation, placements, reporting, and deregistration
- workload create, update, list, get, and delete
- placement inspection
- Kubernetes validate, diff, apply, status, resource listing, and export

Primary SDK surfaces:

- `client.clusters`
- `client.agent`
- `client.raw(...)` for the backend k8s compatibility routes

### `terminal-and-icc.ts`

Use this for interactive and container-to-container protocol flows.

It covers:

- ICC publish, inbox reads, ack, replay, and exec broadcast
- terminal session create, list, get, resize, delete
- terminal WebSocket attach through `client.terminalRealtime`

Primary SDK surfaces:

- `client.platform`
- `client.terminal`
- `client.terminalRealtime`

### `elasticity-control.ts`

Use this for elasticity and orchestrator-safe control operations.

It covers:

- node elasticity status
- direct container resize
- direct function pool target changes
- orchestrator control resize and pool target actions
- workload-function binding and rotation
- workload placement preference
- node-group scale
- control rollback
- control contract discovery

Primary SDK surfaces:

- `client.elasticity`
- `client.functions`
- `client.clusters`
- `client.containers`

### `lifecycle-and-failures.ts`

Use this for lifecycle mutation and error-contract handling.

It covers:

- metrics and logs
- rename, stop, start, kill, and resume
- process kill by PID
- snapshot pin and unpin
- volume rename
- function update, pause, resume, invoke, rollback, and delete
- expected failure-path assertions for bad exec payloads, missing resources, and unauthenticated access

Primary SDK surfaces:

- `client.containers`
- `client.platform`
- `client.volumes`
- `client.functions`
- `client.raw(...)`

## Higher-Level Guidance

Use the typed module surfaces first.

- prefer `client.containers.exec(...)` over a hand-built raw request
- prefer `client.functions.invoke(...)` over a custom fetch wrapper
- prefer `client.elasticity.*` for control-plane elasticity operations
- prefer `client.awaitOperation(...)` and job polling over ad hoc sleeps
- use OCI image pull plus `oci: true` container create for Docker-compatible registry images

Use `client.raw(...)` only when one of these is true:

- the backend route is real and production-supported but not yet wrapped by a higher-level SDK helper
- the example is intentionally demonstrating the raw authenticated contract
- the route is a strict compatibility surface that is better kept explicit than abstracted too early

## Operational Rules

- treat container lifecycle mutations as operation-driven unless the SDK method is explicitly cheap and synchronous
- treat exec as submit-and-track, not inline request/response command execution
- invoke a shell explicitly when shell parsing is required
- pass tenant, join-token, or node-token headers exactly where the backend contract requires them
- do not add local HTTP helper clients in this directory; if a flow needs authenticated transport, it should go through `quilt-sdk`
