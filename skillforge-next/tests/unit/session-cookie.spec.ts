import { describe, expect, it } from "vitest";
import { NextResponse } from "next/server";
import { setSessionCookie } from "@/lib/session-cookie";
import { SESSION_COOKIE } from "@/lib/auth";

describe("session cookie", () => {
  it("sets httpOnly session cookie", () => {
    const response = NextResponse.json({ ok: true });
    setSessionCookie(response, "token123");
    const cookie = response.cookies.get(SESSION_COOKIE);
    expect(cookie?.value).toBe("token123");
    expect(cookie?.httpOnly).toBe(true);
  });
});
