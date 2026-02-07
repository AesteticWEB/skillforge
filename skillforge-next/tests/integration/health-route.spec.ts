import { describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/health/route";

describe("health route", () => {
  it("returns ok payload", async () => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    const response = await GET(new Request("http://localhost/api/health"));
    expect(response.status).toBe(200);
    const payload = await response.json();
    expect(payload.ok).toBe(true);
    expect(payload.status).toBe("ok");
  });
});
