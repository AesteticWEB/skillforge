import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/api-logger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiLogging(request, async () => {
    const quickFixes = await prisma.quickFix.findMany({
      where: { enabled: true },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ ok: true, quickFixes });
  });
}
