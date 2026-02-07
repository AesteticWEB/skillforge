import { describe, expect, it } from "vitest";
import { createSessionToken, verifySessionToken, getSessionSecret } from "@/lib/auth";

describe("auth tokens", () => {
  it("creates and verifies a session token", async () => {
    const secret = getSessionSecret();
    const token = await createSessionToken(
      { sub: "user-1", login: "user1", role: "user" },
      secret,
    );
    const payload = await verifySessionToken(token, secret);
    expect(payload?.login).toBe("user1");
    expect(payload?.role).toBe("user");
  });

  it("rejects invalid token", async () => {
    const secret = getSessionSecret();
    const payload = await verifySessionToken("invalid.token", secret);
    expect(payload).toBeNull();
  });
});
