import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";

export const runtime = "nodejs";

const parseJsonString = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }
  try {
    JSON.parse(value);
    return value;
  } catch {
    return null;
  }
};

const parseNumber = (value: unknown, fallback: number | null = null): number | null => {
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

const parseOptions = (value: unknown) => {
  if (!Array.isArray(value)) {
    return null;
  }
  if (value.length < 2) {
    return null;
  }
  const options = value.map((entry) => {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const text = typeof entry.text === "string" ? entry.text.trim() : "";
    const explanation =
      typeof (entry as { explanation?: unknown }).explanation === "string"
        ? (entry as { explanation: string }).explanation.trim()
        : "";
    if (!text) {
      return null;
    }
    const id =
      typeof (entry as { id?: unknown }).id === "string" &&
      (entry as { id?: string }).id?.trim()
        ? (entry as { id: string }).id.trim()
        : crypto.randomUUID();
    return {
      id,
      text,
      explanation,
      isCorrect: Boolean((entry as { isCorrect?: unknown }).isCorrect),
    };
  });
  if (options.some((entry) => entry === null)) {
    return null;
  }
  const typed = options as {
    id: string;
    text: string;
    explanation: string;
    isCorrect: boolean;
  }[];
  const hasCorrect = typed.some((option) => option.isCorrect);
  if (!hasCorrect) {
    return null;
  }
  return typed;
};

export async function PUT(request: Request, context: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  const id = context.params.id;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ ok: false, error: "Invalid payload" }, { status: 400 });
  }

  const text = typeof body.text === "string" ? body.text.trim() : "";
  const tagsJson = parseJsonString(body.tagsJson);
  if (!text || !tagsJson) {
    return NextResponse.json({ ok: false, error: "Invalid fields" }, { status: 400 });
  }

  const professionRaw =
    typeof body.profession === "string" ? body.profession.trim() : "";
  const profession = professionRaw.length > 0 ? professionRaw : null;
  const difficulty = parseNumber(body.difficulty, null);
  const enabled = Boolean(body.enabled);
  const options = parseOptions(body.options);
  if (!options) {
    return NextResponse.json({ ok: false, error: "Invalid answers" }, { status: 400 });
  }

  await prisma.answerOption.deleteMany({ where: { questionId: id } });

  const question = await prisma.question.update({
    where: { id },
    data: {
      profession,
      text,
      tagsJson,
      difficulty,
      enabled,
      options: {
        create: options.map((option) => ({
          id: option.id,
          text: option.text,
          explanation: option.explanation,
          isCorrect: option.isCorrect,
        })),
      },
    },
    include: { options: true },
  });

  return NextResponse.json({ ok: true, question });
}

export async function DELETE(_: Request, context: { params: { id: string } }) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  const id = context.params.id;
  await prisma.question.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
