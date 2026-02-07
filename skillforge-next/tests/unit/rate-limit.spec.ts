import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("blocks after exceeding max", () => {
    const request = new Request("http://localhost/api", {
      headers: { "x-forwarded-for": "1.1.1.1" },
    });
    const first = rateLimit(request, "test", { windowMs: 1000, max: 1 });
    expect(first.ok).toBe(true);

    const second = rateLimit(request, "test", { windowMs: 1000, max: 1 });
    expect(second.ok).toBe(false);
    if (!second.ok) {
      expect(second.response.status).toBe(429);
    }
  });
});
