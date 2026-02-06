import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

export const runtime = "nodejs";

const SESSION_COOKIE = "sf_session";
const MAX_STATE_BYTES = 1024 * 1024;

const getSession = async () => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) {
    return null;
  }
  const secret = process.env.SESSION_SECRET || "dev-secret";
  return verifySessionToken(token, secret);
};

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const progress = await prisma.userProgress.findUnique({
    where: { userId: session.sub },
  });

  return NextResponse.json({
    ok: true,
    stateJson: progress?.stateJson ?? null,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const stateJson = typeof body?.stateJson === "string" ? body.stateJson : null;
  if (!stateJson) {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const size = new TextEncoder().encode(stateJson).length;
  if (size > MAX_STATE_BYTES) {
    return NextResponse.json(
      { ok: false, error: "Payload too large" },
      { status: 413 },
    );
  }

  await prisma.userProgress.upsert({
    where: { userId: session.sub },
    update: { stateJson },
    create: { userId: session.sub, stateJson },
  });

  return NextResponse.json({ ok: true });
}
