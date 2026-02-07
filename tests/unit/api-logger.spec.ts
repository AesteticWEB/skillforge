import { describe, expect, it, vi } from "vitest";
import { withApiLogging } from "@/lib/api-logger";

describe("withApiLogging", () => {
  it("sets request id header", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const request = new Request("http://localhost/api/health");
    const response = await withApiLogging(request, async () => new Response(null, { status: 204 }));
    expect(response.status).toBe(204);
    expect(response.headers.get("x-request-id")).toBeTruthy();
  });
});
