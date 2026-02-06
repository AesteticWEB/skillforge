import { NextRequest, NextResponse } from "next/server";
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

export async function PUT(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const profession = typeof body.profession === "string" ? body.profession.trim() : "";
  const stage = typeof body.stage === "string" ? body.stage.trim() : "";
  if (!profession || !stage) {
    return NextResponse.json({ ok: false, error: "Invalid fields" }, { status: 400 });
  }

  const passScore = parseNumber(body.passScore, 0);
  const questionCount = parseNumber(body.questionCount, 0);
  const enabled = Boolean(body.enabled);

  const exam = await prisma.exam.update({
    where: { id },
    data: { profession, stage, passScore, questionCount, enabled },
  });

  return NextResponse.json({ ok: true, exam });
}

export async function DELETE(_: NextRequest, context: { params: Promise<{ id: string }> }) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  const { id } = await context.params;
  await prisma.exam.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}


