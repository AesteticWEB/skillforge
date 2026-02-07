import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/api-logger";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiLogging(request, async () => {
    const limiter = rateLimit(request, "content:scenarios", { windowMs: 60_000, max: 120 });
    if (!limiter.ok) {
      return limiter.response;
    }
    const { searchParams } = new URL(request.url);
    const profession = searchParams.get("profession");
    const stage = searchParams.get("stage");

    const scenarios = await prisma.scenario.findMany({
      where: {
        enabled: true,
        ...(profession ? { profession } : {}),
        ...(stage ? { stage } : {}),
      },
      include: { options: true },
      orderBy: { title: "asc" },
    });

    return NextResponse.json({ ok: true, scenarios });
  });
}
