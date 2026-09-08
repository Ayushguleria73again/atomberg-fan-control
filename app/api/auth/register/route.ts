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
        { ok: false, error: "Please provide an email and a password." },
        { status: 400 }
      );
    }

    const email = String(body.email).toLowerCase().trim();
    const password = String(body.password);
    const name = body.name ? String(body.name).trim() : email.split("@")[0];

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { ok: false, error: "Invalid email address format." },
        { status: 400 }
      );
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { ok: false, error: "Password must be at least 6 characters." },
        { status: 400 }
      );
    }

    const userId = crypto.randomUUID();
    const passwordHash = await bcrypt.hash(password, 10);

    // If database is available, persist user
    if (db) {
      const existing = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      if (existing.length > 0) {
        return NextResponse.json(
          { ok: false, error: "An account with this email already exists." },
          { status: 409 }
        );
      }

      await db.insert(users).values({
        id: userId,
        email,
        passwordHash,
        name,
        createdAt: new Date(),
      });
    }

    // Issue 30-day session cookie
    const token = await createSessionToken({
      userId,
      email,
      name,
    });

    const response = NextResponse.json({
      ok: true,
      user: { id: userId, email, name },
      message: "Account created successfully",
    });

    response.cookies.set({
      name: USER_SESSION_COOKIE,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Registration failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
