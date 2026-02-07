import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withApiLogging } from "@/lib/api-logger";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function GET(request: Request) {
  return withApiLogging(request, async () => {
    const limiter = rateLimit(request, "content:questions", { windowMs: 60_000, max: 120 });
    if (!limiter.ok) {
      return limiter.response;
    }
    const { searchParams } = new URL(request.url);
    const examId = searchParams.get("examId");

    if (examId) {
      const exam = await prisma.exam.findUnique({ where: { id: examId } });
      if (!exam) {
        return NextResponse.json({ ok: false, error: "Exam not found" }, { status: 404 });
      }
      const questions = await prisma.question.findMany({
        where: {
          enabled: true,
          OR: [{ profession: exam.profession }, { profession: null }],
        },
        include: { options: true },
        orderBy: { id: "asc" },
      });
      return NextResponse.json({ ok: true, questions });
    }

    const questions = await prisma.question.findMany({
      where: { enabled: true },
      include: { options: true },
      orderBy: { id: "asc" },
    });

    return NextResponse.json({ ok: true, questions });
  });
}
