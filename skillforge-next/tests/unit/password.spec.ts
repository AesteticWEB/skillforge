import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("password hashing", () => {
  it("hashes and verifies passwords", async () => {
    const hash = await hashPassword("Password1");
    expect(hash).not.toBe("Password1");
    expect(await verifyPassword("Password1", hash)).toBe(true);
    expect(await verifyPassword("WrongPassword1", hash)).toBe(false);
  });
});
