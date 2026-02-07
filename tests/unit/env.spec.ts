import { describe, expect, it } from "vitest";
import { validateEnv } from "@/lib/env";

describe("env validation", () => {
  it("accepts valid env values", () => {
    const env = validateEnv({
      NODE_ENV: "test",
      DATABASE_URL: "file:./test.db",
      SESSION_SECRET: "test-secret-32-characters-minimum",
      LOG_LEVEL: "info",
    });
    expect(env.DATABASE_URL).toBe("file:./test.db");
  });

  it("throws on missing required fields", () => {
    expect(() => validateEnv({})).toThrow("Invalid environment configuration");
  });
});
