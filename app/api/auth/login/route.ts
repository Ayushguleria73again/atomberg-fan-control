import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { db, users } from "@/lib/db";
import { eq } from "drizzle-orm";
import { createSessionToken, USER_SESSION_COOKIE } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    if (!body || !body.email || !body.password) {
      return NextResponse.json(
        { ok: false, error: "Please enter your email and password." },
        { status: 400 }
      );
    }

    const email = String(body.email).toLowerCase().trim();
    const password = String(body.password);

    if (db) {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing.length === 0) {
        return NextResponse.json(
          { ok: false, error: "Invalid email or password." },
          { status: 401 }
        );
      }

      const user = existing[0];

      if (!user.passwordHash) {
        return NextResponse.json(
          { ok: false, error: "Account credentials misconfigured." },
          { status: 401 }
        );
      }

      const isValid = await bcrypt.compare(password, user.passwordHash);

      if (!isValid) {
        return NextResponse.json(
          { ok: false, error: "Invalid email or password." },
          { status: 401 }
        );
      }

      const token = await createSessionToken({
        userId: user.id,
        email: user.email,
        name: user.name,
      });

      const response = NextResponse.json({
        ok: true,
        user: { id: user.id, email: user.email, name: user.name },
        message: "Logged in successfully",
      });

      response.cookies.set({
        name: USER_SESSION_COOKIE,
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 30 * 24 * 60 * 60,
      });

      return response;
    }

    // Fallback if DB not configured yet (e.g. initial setup)
    return NextResponse.json(
      { ok: false, error: "Database not connected. Please configure DATABASE_URL." },
      { status: 503 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Login failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
