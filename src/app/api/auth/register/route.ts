import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, getSessionSecret } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { hashPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session-cookie";
import { isValidLogin, isValidPassword, normalizeLogin } from "@/lib/validation";
import { withApiLogging } from "@/lib/api-logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withApiLogging(request, async () => {
    const limiter = rateLimit(request, "auth:register", { windowMs: 60_000, max: 5 });
    if (!limiter.ok) {
      return limiter.response;
    }
    const body = await request.json().catch(() => null);
    const login = normalizeLogin(body?.login);
    const password = typeof body?.password === "string" ? body.password : "";

    if (!isValidLogin(login) || !isValidPassword(password)) {
      return NextResponse.json(
        { ok: false, error: "Login and password are required" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({ where: { login } });
    if (existing) {
      return NextResponse.json(
        { ok: false, error: "Login is already taken" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        login,
        passwordHash,
        role: "user",
      },
    });

    const secret = getSessionSecret();
    const token = await createSessionToken(
      {
        sub: user.id,
        login: user.login,
        role: user.role,
      },
      secret,
    );

    const response = NextResponse.json({ ok: true });
    setSessionCookie(response, token);

    return response;
  });
}
