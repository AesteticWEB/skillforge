import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET() {
  const quickFixes = await prisma.quickFix.findMany({
    where: { enabled: true },
    orderBy: { id: "asc" },
  });

  return NextResponse.json({ ok: true, quickFixes });
}
