import { describe, expect, it } from "vitest";
import { metricsRegistry, recordRequest } from "@/lib/metrics";

describe("metrics", () => {
  it("records HTTP metrics", async () => {
    recordRequest("GET", "/api/health", 200, 12);
    const output = await metricsRegistry.metrics();
    expect(output).toContain("skillforge_http_requests_total");
    expect(output).toContain("skillforge_http_request_duration_ms");
  });
});
