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

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  const { searchParams } = new URL(request.url);
  const profession = searchParams.get("profession");
  const stage = searchParams.get("stage");

  const exams = await prisma.exam.findMany({
    where: {
      ...(profession ? { profession } : {}),
      ...(stage ? { stage } : {}),
    },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ ok: true, exams });
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

  const profession = typeof body.profession === "string" ? body.profession.trim() : "";
  const stage = typeof body.stage === "string" ? body.stage.trim() : "";
  if (!profession || !stage) {
    return NextResponse.json({ ok: false, error: "Invalid fields" }, { status: 400 });
  }

  const passScore = parseNumber(body.passScore, 0);
  const questionCount = parseNumber(body.questionCount, 0);
  const enabled = Boolean(body.enabled);
  const id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : crypto.randomUUID();

  const exam = await prisma.exam.create({
    data: {
      id,
      profession,
      stage,
      passScore,
      questionCount,
      enabled,
    },
  });

  return NextResponse.json({ ok: true, exam });
}
