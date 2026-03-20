# quilt-sdk

Type-safe TypeScript SDK for interacting with Quilt platform APIs.

This package is the interaction plane for Quilt production APIs, including:

- Core HTTP API resources (`containers`, `volumes`, `projects`, `clusters`, `functions`, etc.)
- Production platform extensions (`platform` module: env/jobs/archive/ops/ICC and related endpoints)
- Realtime APIs (SSE events and WebSocket terminal attach)
- OpenAI-compatible tool schema export (`QUILT_TOOLS`)

## Install

```bash
bun add quilt-sdk
```

## Quick Start

```ts
import { QuiltClient } from "quilt-sdk";

const quilt = QuiltClient.connect({
  baseUrl: "https://backend.quilt.sh",
  apiKey: process.env.QUILT_API_KEY,
});

const containers = await quilt.containers.list();
console.log(containers);
```

## Auth

`QuiltClient.connect()` accepts:

- `token` for bearer auth
- `apiKey` for `X-Api-Key`
- explicit `auth` union for advanced usage

If both `token` and `apiKey` are provided, API key auth is used.

## Realtime

### SSE

```ts
const source = quilt.events.openEventSource();
quilt.events.on(source, "container_update", (event) => {
  console.log(event.data);
});
```

### WebSocket Terminal

```ts
const ws = quilt.terminalRealtime.connect({ container_identifier: "ctr_123", cols: 120, rows: 30 });
ws.addEventListener("message", (msg) => {
  if (typeof msg.data === "string") {
    const parsed = quilt.terminalRealtime.parseServerMessage(msg.data);
    console.log(parsed);
  }
});
```

## Production Platform Module

The `platform` namespace exposes production endpoints that are part of live backend behavior and script-driven workflows, including:

- Container env, rename, archive, jobs, ready/resume/fork
- Snapshot clone and operation status
- Volume archive/files helpers
- Network allocations and monitor process queries
- ICC endpoints

```ts
const op = await quilt.containers.stop("ctr_123", "async");
if ("operation_id" in (op as Record<string, unknown>)) {
  const done = await quilt.awaitOperation((op as { operation_id: string }).operation_id);
  console.log(done.status);
}
```

## Scripts

```bash
bun run lint
bun run typecheck
bun run test
bun run build
```

## License

MIT
