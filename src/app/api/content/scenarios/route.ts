import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(request: Request) {
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
}
