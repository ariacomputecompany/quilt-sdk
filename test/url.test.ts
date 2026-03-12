import { describe, expect, test } from "bun:test";
import { applyPathParams, buildUrl } from "../src/core/url";

describe("url helpers", () => {
  test("applies path params", () => {
    const path = applyPathParams("/api/containers/{id}", { id: "abc 123" });
    expect(path).toBe("/api/containers/abc%20123");
  });

  test("builds url with query params", () => {
    const url = buildUrl({
      baseUrl: "https://backend.quilt.sh",
      path: "/api/containers/{id}",
      pathParams: { id: "c1" },
      query: { state: "running", limit: 10, tags: ["a", "b"] },
    });

    expect(url.toString()).toContain("/api/containers/c1");
    expect(url.searchParams.get("state")).toBe("running");
    expect(url.searchParams.get("limit")).toBe("10");
    expect(url.searchParams.getAll("tags")).toEqual(["a", "b"]);
  });
});
