import { NextRequest, NextResponse } from "next/server";
import {
  SESSION_COOKIE_NAME,
  generateSessionToken,
  isValidSession,
} from "@/lib/auth";

export const dynamic = "force-dynamic";

// In-memory rate limiting for failed auth attempts
interface AttemptRecord {
  count: number;
  resetAt: number;
}
const failedAttemptsMap = new Map<string, AttemptRecord>();

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return req.headers.get("x-real-ip") || "unknown-ip";
}

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = failedAttemptsMap.get(ip);

  if (!record || now > record.resetAt) {
    return true; // OK
  }

  // Allow up to 5 failed attempts in a 60-second window
  return record.count < 5;
}

function recordFailedAttempt(ip: string): void {
  const now = Date.now();
  const record = failedAttemptsMap.get(ip);

  if (!record || now > record.resetAt) {
    failedAttemptsMap.set(ip, {
      count: 1,
      resetAt: now + 60_000,
    });
  } else {
    record.count += 1;
  }
}

function clearRateLimit(ip: string): void {
  failedAttemptsMap.delete(ip);
}

export async function POST(request: NextRequest) {
  try {
    const ip = getClientIp(request);

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          ok: false,
          error: "Too many failed attempts. Please wait 1 minute before trying again.",
        },
        { status: 429 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const { action, passcode } = body;

    // Logout Action
    if (action === "logout") {
      const response = NextResponse.json({
        ok: true,
        message: "Logged out successfully",
      });
      response.cookies.set({
        name: SESSION_COOKIE_NAME,
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
      });
      return response;
    }

    // Login Action
    const serverPasscode = process.env.APP_PASSCODE;

    if (!serverPasscode) {
      return NextResponse.json(
        {
          ok: false,
          error: "No APP_PASSCODE is configured on the server.",
        },
        { status: 500 }
      );
    }

    if (!passcode || typeof passcode !== "string") {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { ok: false, error: "Please provide a valid passcode." },
        { status: 400 }
      );
    }

    if (passcode.trim() !== serverPasscode.trim()) {
      recordFailedAttempt(ip);
      return NextResponse.json(
        { ok: false, error: "Incorrect passcode. Access denied." },
        { status: 401 }
      );
    }

    // Success: Clear failed attempts and set 30-day session cookie
    clearRateLimit(ip);
    const token = await generateSessionToken(serverPasscode.trim());

    const response = NextResponse.json({
      ok: true,
      message: "Authenticated successfully",
    });

    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 30 * 24 * 60 * 60, // 30 days
    });

    return response;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Authentication error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isAuth = await isValidSession(sessionCookie);

  return NextResponse.json({
    authenticated: isAuth,
    passcodeConfigured: Boolean(process.env.APP_PASSCODE),
  });
}
