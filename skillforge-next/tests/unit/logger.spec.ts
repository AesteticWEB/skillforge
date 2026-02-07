import { describe, expect, it, vi } from "vitest";
import { logInfo } from "@/lib/logger";

describe("logger", () => {
  it("writes structured JSON logs", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    logInfo("hello", { foo: "bar" });
    expect(spy).toHaveBeenCalled();
    const payload = JSON.parse(String(spy.mock.calls[0]?.[0]));
    expect(payload.level).toBe("info");
    expect(payload.message).toBe("hello");
    expect(payload.data.foo).toBe("bar");
    spy.mockRestore();
  });
});
