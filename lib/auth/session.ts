import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const USER_SESSION_COOKIE = "fc_user_session";
const SESSION_SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "fancontrol_secure_auth_secret_key_2026";

export interface UserSessionPayload {
  userId: string;
  email: string;
  name?: string | null;
  issuedAt: number;
}

/**
 * Creates a signed session token.
 */
export async function createSessionToken(payload: Omit<UserSessionPayload, "issuedAt">): Promise<string> {
  const fullPayload: UserSessionPayload = {
    ...payload,
    issuedAt: Date.now(),
  };

  const payloadStr = JSON.stringify(fullPayload);
  const encoder = new TextEncoder();
  const data = encoder.encode(payloadStr + ":" + SESSION_SECRET);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const signature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  const b64Payload = Buffer.from(payloadStr, "utf8").toString("base64url");
  return `${b64Payload}.${signature}`;
}

/**
 * Verifies and decodes a signed session token.
 */
export async function verifySessionToken(token: string | undefined): Promise<UserSessionPayload | null> {
  if (!token || typeof token !== "string" || !token.includes(".")) {
    return null;
  }

  const [b64Payload, signature] = token.split(".");
  if (!b64Payload || !signature) return null;

  try {
    const payloadStr = Buffer.from(b64Payload, "base64url").toString("utf8");
    const encoder = new TextEncoder();
    const data = encoder.encode(payloadStr + ":" + SESSION_SECRET);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const expectedSignature = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

    if (signature !== expectedSignature) {
      return null;
    }

    const payload = JSON.parse(payloadStr) as UserSessionPayload;
    // Session valid for 30 days
    if (Date.now() - payload.issuedAt > 30 * 24 * 60 * 60 * 1000) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

/**
 * Server-side helper to get the currently authenticated user in API routes & Server Components.
 */
export async function getServerUserSession(): Promise<UserSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(USER_SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}

/**
 * Middleware helper to verify session from incoming NextRequest.
 */
export async function getRequestUserSession(request: NextRequest): Promise<UserSessionPayload | null> {
  const token = request.cookies.get(USER_SESSION_COOKIE)?.value;
  return verifySessionToken(token);
}
