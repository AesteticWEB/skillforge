import type { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

export const setSessionCookie = (response: NextResponse, token: string): void => {
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
};
