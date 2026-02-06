import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySessionToken } from "@/lib/auth";
import type { SessionPayload } from "@/lib/auth";

const SESSION_COOKIE = "sf_session";

export const requireSession = async (): Promise<
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse }
> => {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    };
  }
  const secret = process.env.SESSION_SECRET || "dev-secret";
  const session = await verifySessionToken(token, secret);
  if (!session) {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { ok: true, session };
};

export const requireAdmin = async (): Promise<
  | { ok: true; session: SessionPayload }
  | { ok: false; response: NextResponse }
> => {
  const guard = await requireSession();
  if (!guard.ok) {
    return guard;
  }
  const { session } = guard;
  if (session.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ ok: false, error: "Forbidden" }, { status: 403 }),
    };
  }
  return { ok: true, session };
};
