import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/api-logger";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiLogging(request, async () => {
    const { searchParams } = new URL(request.url);
    const profession = searchParams.get("profession");
    const stage = searchParams.get("stage");

    const exams = await prisma.exam.findMany({
      where: {
        enabled: true,
        ...(profession ? { profession } : {}),
        ...(stage ? { stage } : {}),
      },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ ok: true, exams });
  });
}
