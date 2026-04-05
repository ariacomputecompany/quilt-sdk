import type { QuiltClient } from "../core/client";
import type { JsonRequestBody } from "../types/surface";

export type ContainerStreamRequest = JsonRequestBody<"/api/containers/{id}/stream", "post">;

export type ContainerStreamFrame =
  | { type: "started"; container_id: string; pid: number }
  | { type: "stdout"; data_b64: string }
  | { type: "stderr"; data_b64: string }
  | { type: "timeout"; elapsed_ms: number; message: string }
  | { type: "exit"; code: number; elapsed_ms: number }
  | { type: "error"; message: string };

export class ContainerStreamsClient {
  public constructor(private readonly client: QuiltClient) {}

  public async open(
    containerIdentifier: string,
    body: ContainerStreamRequest,
    options: { signal?: AbortSignal } = {},
  ): Promise<AsyncIterable<ContainerStreamFrame>> {
    const response = await this.client.rawResponse("post", "/api/containers/{id}/stream", {
      pathParams: { id: containerIdentifier },
      body,
      signal: options.signal,
      headers: {
        Accept: "application/x-ndjson",
      },
    });

    if (response.body === null) {
      throw new Error("Container stream response did not include a body");
    }

    return parseNdjsonFrames(response.body);
  }
}

async function* parseNdjsonFrames(
  body: ReadableStream<Uint8Array>,
): AsyncGenerator<ContainerStreamFrame, void, void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length === 0) {
          continue;
        }
        yield parseFrame(trimmed);
      }
    }

    buffer += decoder.decode();
    const trimmed = buffer.trim();
    if (trimmed.length > 0) {
      yield parseFrame(trimmed);
    }
  } finally {
    reader.releaseLock();
  }
}

function parseFrame(line: string): ContainerStreamFrame {
  const parsed = JSON.parse(line) as ContainerStreamFrame;
  if (!parsed || typeof parsed !== "object" || typeof parsed.type !== "string") {
    throw new Error(`Invalid container stream frame: ${line}`);
  }
  return parsed;
}
