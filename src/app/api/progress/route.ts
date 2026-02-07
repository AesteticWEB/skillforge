import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/server-auth";
import { withApiLogging } from "@/lib/api-logger";

export const runtime = "nodejs";

const MAX_STATE_BYTES = 1024 * 1024;

export async function GET(request: Request) {
  return withApiLogging(request, async () => {
    const guard = await requireSession();
    if (!guard.ok) {
      return guard.response;
    }

    const progress = await prisma.userProgress.findUnique({
      where: { userId: guard.session.sub },
    });

    return NextResponse.json({
      ok: true,
      stateJson: progress?.stateJson ?? null,
    });
  });
}

export async function POST(request: Request) {
  return withApiLogging(request, async () => {
    const guard = await requireSession();
    if (!guard.ok) {
      return guard.response;
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
      where: { userId: guard.session.sub },
      update: { stateJson },
      create: { userId: guard.session.sub, stateJson },
    });

    return NextResponse.json({ ok: true });
  });
}
