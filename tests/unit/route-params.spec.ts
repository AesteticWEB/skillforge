import { describe, expect, it } from "vitest";
import { getRequiredId } from "@/lib/route-params";

describe("getRequiredId", () => {
  it("returns trimmed id", async () => {
    const id = await getRequiredId({
      params: Promise.resolve({ id: " 123 " }),
    });
    expect(id).toBe("123");
  });

  it("returns null for missing id", async () => {
    const id = await getRequiredId({
      params: Promise.resolve({ id: null }),
    });
    expect(id).toBeNull();
  });
});
