import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/api-logger";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiLogging(request, async () => {
    const limiter = rateLimit(request, "content:quick-fixes", { windowMs: 60_000, max: 120 });
    if (!limiter.ok) {
      return limiter.response;
    }
    const quickFixes = await prisma.quickFix.findMany({
      where: { enabled: true },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ ok: true, quickFixes });
  });
}
