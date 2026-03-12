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
});
