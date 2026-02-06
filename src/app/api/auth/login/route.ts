import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";

export const runtime = "nodejs";

const SESSION_COOKIE = "sf_session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const login = typeof body?.login === "string" ? body.login.trim() : "";
  const password = typeof body?.password === "string" ? body.password : "";

  if (!login || !password) {
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

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return NextResponse.json(
      { ok: false, error: "Invalid credentials" },
      { status: 401 },
    );
  }

  const secret = process.env.SESSION_SECRET || "dev-secret";
  const token = await createSessionToken(
    {
      sub: user.id,
      login: user.login,
      role: user.role,
      iat: Math.floor(Date.now() / 1000),
    },
    secret,
  );

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
