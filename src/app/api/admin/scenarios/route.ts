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

const parseOptions = (value: unknown) => {
  if (!Array.isArray(value)) {
    return null;
  }
  if (value.length !== 4) {
    return null;
  }
  const options = value.map((entry) => {
    if (!entry || typeof entry !== "object") {
      return null;
    }
    const text = typeof entry.text === "string" ? entry.text.trim() : "";
    const effectsJson = parseJsonString((entry as { effectsJson?: unknown }).effectsJson);
    if (!text || !effectsJson) {
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
      isCorrect: Boolean((entry as { isCorrect?: unknown }).isCorrect),
      effectsJson,
    };
  });
  if (options.some((entry) => entry === null)) {
    return null;
  }
  return options as { id: string; text: string; isCorrect: boolean; effectsJson: string }[];
};

export async function GET(request: Request) {
  const guard = await requireAdmin();
  if (!guard.ok) {
    return guard.response;
  }

  const { searchParams } = new URL(request.url);
  const profession = searchParams.get("profession");
  const stage = searchParams.get("stage");

  const scenarios = await prisma.scenario.findMany({
    where: {
      ...(profession ? { profession } : {}),
      ...(stage ? { stage } : {}),
    },
    include: { options: true },
    orderBy: { title: "asc" },
  });

  return NextResponse.json({ ok: true, scenarios });
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
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (!profession || !stage || !title || !description) {
    return NextResponse.json({ ok: false, error: "Invalid fields" }, { status: 400 });
  }

  const rewardXp = parseNumber(body.rewardXp, 0);
  const rewardCoins = parseNumber(body.rewardCoins, 0);
  const enabled = Boolean(body.enabled);
  const options = parseOptions(body.options);
  if (!options) {
    return NextResponse.json({ ok: false, error: "Invalid options" }, { status: 400 });
  }

  const id = typeof body.id === "string" && body.id.trim() ? body.id.trim() : crypto.randomUUID();

  const scenario = await prisma.scenario.create({
    data: {
      id,
      profession,
      stage,
      title,
      description,
      rewardXp,
      rewardCoins,
      enabled,
      options: {
        create: options.map((option) => ({
          id: option.id,
          text: option.text,
          isCorrect: option.isCorrect,
          effectsJson: option.effectsJson,
        })),
      },
    },
    include: { options: true },
  });

  return NextResponse.json({ ok: true, scenario });
}
