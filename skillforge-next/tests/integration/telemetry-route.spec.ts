import { describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/telemetry/route";

describe("telemetry route", () => {
  it("accepts valid payload", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const response = await POST(
      new Request("http://localhost/api/telemetry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          level: "error",
          message: "Something broke",
          occurredAt: new Date().toISOString(),
        }),
      }),
    );
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
  });

  it("rejects invalid payload", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const response = await POST(
      new Request("http://localhost/api/telemetry", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      }),
    );
    expect(response.status).toBe(400);
  });
});
