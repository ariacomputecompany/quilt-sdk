import { describe, expect, test } from "bun:test";
import { QuiltApiError } from "../src/core/errors";
import { QuiltClient } from "../src/index";

describe("QuiltClient", () => {
  test("sends api key auth header", async () => {
    const quilt = QuiltClient.connect({
      baseUrl: "https://backend.quilt.sh",
      apiKey: "quilt_sk_test",
      fetch: async (_input: RequestInfo | URL, init?: RequestInit) => {
        const headers = init?.headers as Record<string, string>;
        expect(headers["X-Api-Key"]).toBe("quilt_sk_test");

        return new Response(JSON.stringify({ status: "healthy" }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
      },
    });

    const result = await quilt.system.health();
    expect((result as unknown as { status: string }).status).toBe("healthy");
  });

  test("throws QuiltApiError on non-2xx", async () => {
    const quilt = QuiltClient.connect({
      baseUrl: "https://backend.quilt.sh",
      token: "jwt",
      fetch: async () => {
        return new Response(
          JSON.stringify({
            error: "Unauthorized",
            error_code: "UNAUTHORIZED",
            request_id: "req_1",
          }),
          {
            status: 401,
            headers: { "content-type": "application/json" },
          },
        );
      },
    });

    await expect(quilt.system.info()).rejects.toBeInstanceOf(QuiltApiError);
  });

  test("parses container stream NDJSON frames", async () => {
    const encoder = new TextEncoder();
    const quilt = QuiltClient.connect({
      baseUrl: "https://backend.quilt.sh",
      apiKey: "quilt_sk_test",
      fetch: async () => {
        const stream = new ReadableStream<Uint8Array>({
          start(controller) {
            controller.enqueue(
              encoder.encode(
                '{"type":"started","container_id":"ctr_1","pid":1234}\n{"type":"stdout","data_b64":"aGVsbG8K"}\n{"type":"exit","code":0,"elapsed_ms":9}\n',
              ),
            );
            controller.close();
          },
        });
        return new Response(stream, {
          status: 200,
          headers: { "content-type": "application/x-ndjson" },
        });
      },
    });

    const frames = await quilt.containerStreams.open("ctr_1", {
      command: ["echo", "hello"],
    });
    const seen: string[] = [];
    for await (const frame of frames) {
      seen.push(frame.type);
    }

    expect(seen).toEqual(["started", "stdout", "exit"]);
  });
});
