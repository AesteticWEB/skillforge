import { describe, expect, it } from "vitest";
import { isValidLogin, isValidPassword } from "@/lib/validation";

describe("validation", () => {
  it("validates login format", () => {
    expect(isValidLogin("user_01")).toBe(true);
    expect(isValidLogin("ab")).toBe(false);
  });

  it("enforces password policy", () => {
    expect(isValidPassword("short1")).toBe(false);
    expect(isValidPassword("longpassword")).toBe(false);
    expect(isValidPassword("Password12")).toBe(true);
  });
});
