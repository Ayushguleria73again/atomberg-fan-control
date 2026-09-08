import { NextResponse } from "next/server";
import { USER_SESSION_COOKIE } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = NextResponse.json({
    ok: true,
    message: "Logged out successfully",
  });

  response.cookies.set({
    name: USER_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });

  return response;
}
