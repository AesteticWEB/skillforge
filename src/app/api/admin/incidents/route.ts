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

const parseOptions = (value: unknown) => {
  if (!Array.isArray(value)) {
    return null;
  }
  if (value.length !== 3) {
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
      effectsJson,
    };
  });
  if (options.some((entry) => entry === null)) {
    return null;
  }
  return options as { id: string; text: string; effectsJson: string }[];
};

export async function GET(request: Request) {
  return withApiLogging(request, async () => {
    const guard = await requireAdmin();
    if (!guard.ok) {
      return guard.response;
    }

    const incidents = await prisma.incident.findMany({
      include: { options: true },
      orderBy: { title: "asc" },
    });

    return NextResponse.json({ ok: true, incidents });
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
    const severity = typeof body.severity === "string" ? body.severity.trim() : "";
    if (!title || !description || !severity) {
      return NextResponse.json({ ok: false, error: "Invalid fields" }, { status: 400 });
    }

    const enabled = Boolean(body.enabled);
    const options = parseOptions(body.options);
    if (!options) {
      return NextResponse.json({ ok: false, error: "Invalid options" }, { status: 400 });
    }

    const id =
      typeof body.id === "string" && body.id.trim() ? body.id.trim() : crypto.randomUUID();

    const incident = await prisma.incident.create({
      data: {
        id,
        title,
        description,
        severity,
        enabled,
        options: {
          create: options.map((option) => ({
            id: option.id,
            text: option.text,
            effectsJson: option.effectsJson,
          })),
        },
      },
      include: { options: true },
    });

    return NextResponse.json({ ok: true, incident });
  });
}
