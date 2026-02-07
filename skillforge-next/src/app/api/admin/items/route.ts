import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/server-auth";
import { withApiLogging } from "@/lib/api-logger";

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

export async function GET(request: Request) {
  return withApiLogging(request, async () => {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return guard.response;
    }

    const items = await prisma.item.findMany({ orderBy: { title: "asc" } });
    return NextResponse.json({ ok: true, items });
  });
}

export async function POST(request: Request) {
  return withApiLogging(request, async () => {
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
    const rarity = typeof body.rarity === "string" ? body.rarity.trim() : "";
    const effectsJson = parseJsonString(body.effectsJson);
    if (!title || !description || !rarity || !effectsJson) {
      return NextResponse.json({ ok: false, error: "Invalid fields" }, { status: 400 });
    }

    const priceCoins = parseNumber(body.priceCoins, 0);
    const priceCashRaw = body.priceCash;
    const priceCash =
      priceCashRaw === null || priceCashRaw === undefined || priceCashRaw === ""
        ? null
        : parseNumber(priceCashRaw, 0);

    const enabled = Boolean(body.enabled);
    const id =
      typeof body.id === "string" && body.id.trim() ? body.id.trim() : crypto.randomUUID();

    const item = await prisma.item.create({
      data: {
        id,
        title,
        description,
        priceCoins,
        priceCash,
        rarity,
        effectsJson,
        enabled,
      },
    });

    return NextResponse.json({ ok: true, item });
  });
}
