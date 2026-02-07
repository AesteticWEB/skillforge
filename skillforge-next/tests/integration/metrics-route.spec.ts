import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/metrics/route";

describe("metrics route", () => {
  it("returns prometheus metrics", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const response = await GET(new Request("http://localhost/api/metrics"));
    expect(response.status).toBe(200);
    const text = await response.text();
    expect(text).toContain("skillforge_http_requests_total");
  });
});
