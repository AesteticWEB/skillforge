import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, getSessionSecret } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { hashPassword, verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session-cookie";
import { isValidLogin, isValidPassword, normalizeLogin } from "@/lib/validation";
import { withApiLogging } from "@/lib/api-logger";

export const runtime = "nodejs";

const ADMIN_LOGIN = "admin1";
const ADMIN_PASSWORD = "admin1";

export async function POST(request: Request) {
  return withApiLogging(request, async () => {
    const limiter = rateLimit(request, "auth:login", { windowMs: 60_000, max: 10 });
    if (!limiter.ok) {
      return limiter.response;
    }
    const body = await request.json().catch(() => null);
    const login = normalizeLogin(body?.login);
    const password = typeof body?.password === "string" ? body.password : "";

    if (login === ADMIN_LOGIN) {
      if (password !== ADMIN_PASSWORD) {
        return NextResponse.json(
          { ok: false, error: "Invalid credentials" },
          { status: 401 },
        );
      }
      const passwordHash = await hashPassword(ADMIN_PASSWORD);
      const existing = await prisma.user.findUnique({ where: { login: ADMIN_LOGIN } });
      const user = existing
        ? await prisma.user.update({
            where: { id: existing.id },
            data: { passwordHash, role: "admin" },
          })
        : await prisma.user.create({
            data: { login: ADMIN_LOGIN, passwordHash, role: "admin" },
          });

      const token = await createSessionToken(
        {
          sub: user.id,
          login: user.login,
          role: user.role,
        },
        getSessionSecret(),
      );
      const response = NextResponse.json({ ok: true });
      setSessionCookie(response, token);
      return response;
    }

    if (!isValidLogin(login) || !isValidPassword(password)) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { login },
    });

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 },
      );
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: "Invalid credentials" },
        { status: 401 },
      );
    }

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
