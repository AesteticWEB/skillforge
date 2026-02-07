import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createSessionToken, getSessionSecret } from "@/lib/auth";
import { rateLimit } from "@/lib/rate-limit";
import { requireSession } from "@/lib/server-auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { setSessionCookie } from "@/lib/session-cookie";
import { isValidPassword } from "@/lib/validation";
import { withApiLogging } from "@/lib/api-logger";

export const runtime = "nodejs";

export async function POST(request: Request) {
  return withApiLogging(request, async () => {
    const limiter = rateLimit(request, "auth:change-password", { windowMs: 60_000, max: 5 });
    if (!limiter.ok) {
      return limiter.response;
    }
    const guard = await requireSession();
    if (!guard.ok) {
      return guard.response;
    }

    const body = await request.json().catch(() => null);
    const currentPassword =
      typeof body?.currentPassword === "string" ? body.currentPassword : "";
    const newPassword = typeof body?.newPassword === "string" ? body.newPassword : "";
    const confirm = typeof body?.confirm === "string" ? body.confirm : "";

    if (!currentPassword || !newPassword || !confirm) {
      return NextResponse.json({ ok: false, error: "Missing fields" }, { status: 400 });
    }

    if (newPassword !== confirm) {
      return NextResponse.json(
        { ok: false, error: "Passwords do not match" },
        { status: 400 },
      );
    }
    if (!isValidPassword(newPassword)) {
      return NextResponse.json({ ok: false, error: "Password too weak" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: guard.session.sub } });
    if (!user) {
      return NextResponse.json({ ok: false, error: "User not found" }, { status: 404 });
    }

    const matches = await verifyPassword(currentPassword, user.passwordHash);
    if (!matches) {
      return NextResponse.json(
        { ok: false, error: "Invalid current password" },
        { status: 400 },
      );
    }

    const passwordHash = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { passwordHash },
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
