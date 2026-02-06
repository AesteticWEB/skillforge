import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";

export const runtime = "nodejs";

const parseNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.trunc(value);
  }
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return Math.trunc(parsed);
    }
  }
  return fallback;
};

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  const quickFixes = await prisma.quickFix.findMany({ orderBy: { title: "asc" } });
  return NextResponse.json({ ok: true, quickFixes });
}

export async function POST(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!title || !description) {
    return NextResponse.json({ ok: false, error: "Invalid fields" }, { status: 400 });
  }

  const rewardCoins = parseNumber(body.rewardCoins, 0);
  const enabled = Boolean(body.enabled);
  const id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : crypto.randomUUID();

  const quickFix = await prisma.quickFix.create({
    data: {
      id,
      title,
      description,
      rewardCoins,
      enabled,
    },
  });

  return NextResponse.json({ ok: true, quickFix });
}
