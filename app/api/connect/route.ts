import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { atombergConnections } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { encryptCredentials, isEncryptionConfigured } from "@/lib/crypto/encryption";
import { invalidateAccessToken, invalidateFanState } from "@/lib/cache";
import { checkConnectRateLimit } from "@/lib/rate-limit";

const ATOMBERG_BASE_URL = "https://api.developer.atomberg-iot.com";

/**
 * Validate submitted Atomberg credentials directly with Atomberg's live endpoint
 * before storing anything.
 */
async function validateAtombergCredentials(
  apiKey: string,
  refreshToken: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${ATOMBERG_BASE_URL}/v1/get_access_token`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${refreshToken.trim()}`,
        "x-api-key": apiKey.trim(),
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      let message = "Invalid API key or refresh token. Atomberg rejected the credentials.";
      if (res.status === 401 || res.status === 403) {
        message = "Authentication failed. Please check that your API Key and Refresh Token are correct.";
      } else if (res.status === 429) {
        message = "Atomberg rate limit reached. Please try again in a few moments.";
      }
      return { ok: false, error: message };
    }

    const data = await res.json().catch(() => null);
    const token = data?.message?.access_token || data?.data?.message?.access_token;
    if (!token || typeof token !== "string") {
      return { ok: false, error: "Atomberg API returned an unexpected response format." };
    }

    return { ok: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to reach Atomberg API";
    return { ok: false, error: `Connection failed: ${msg}` };
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getSessionFromCookie(req);
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const conn = await db
      .select({
        id: atombergConnections.id,
        createdAt: atombergConnections.createdAt,
        lastUsedAt: atombergConnections.lastUsedAt,
      })
      .from(atombergConnections)
      .where(eq(atombergConnections.userId, session.userId))
      .limit(1);

    if (!conn.length) {
      return NextResponse.json({ connected: false });
    }

    return NextResponse.json({
      connected: true,
      createdAt: conn[0].createdAt,
      lastUsedAt: conn[0].lastUsedAt,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Database error checking connection" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookie(req);
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    // Rate limit: 5 connect attempts per 60s per user
    const ratelimit = await checkConnectRateLimit(session.userId);
    if (!ratelimit.success) {
      return NextResponse.json(
        {
          ok: false,
          error: "Too many credential verification attempts. Please wait a minute.",
        },
        {
          status: 429,
          headers: {
            "Retry-After": Math.ceil((ratelimit.reset - Date.now()) / 1000).toString(),
          },
        }
      );
    }

    // Startup / Config guard: verify encryption key is set and valid
    if (!isEncryptionConfigured()) {
      return NextResponse.json(
        { ok: false, error: "Server encryption is misconfigured." },
        { status: 500 }
      );
    }

    let body: { apiKey?: string; refreshToken?: string };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    const { apiKey, refreshToken } = body;
    if (!apiKey || typeof apiKey !== "string" || !apiKey.trim()) {
      return NextResponse.json({ ok: false, error: "API Key is required" }, { status: 400 });
    }
    if (!refreshToken || typeof refreshToken !== "string" || !refreshToken.trim()) {
      return NextResponse.json({ ok: false, error: "Refresh Token is required" }, { status: 400 });
    }

    // 1. Live credential validation with Atomberg before storing
    const validation = await validateAtombergCredentials(apiKey, refreshToken);
    if (!validation.ok) {
      return NextResponse.json({ ok: false, error: validation.error }, { status: 400 });
    }

    // 2. Encrypt credentials inside try/catch block
    let encrypted;
    try {
      encrypted = encryptCredentials(apiKey, refreshToken);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Server encryption is misconfigured." },
        { status: 500 }
      );
    }

    // 3. Upsert into database
    await db
      .insert(atombergConnections)
      .values({
        userId: session.userId,
        encCredentials: encrypted.encCredentials,
        iv: encrypted.iv,
        authTag: encrypted.authTag,
        keyVersion: encrypted.keyVersion,
        createdAt: new Date(),
        lastUsedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: atombergConnections.userId,
        set: {
          encCredentials: encrypted.encCredentials,
          iv: encrypted.iv,
          authTag: encrypted.authTag,
          keyVersion: encrypted.keyVersion,
          lastUsedAt: new Date(),
        },
      });

    // Reset caches for this user
    invalidateAccessToken(session.userId);
    invalidateFanState(session.userId);

    return NextResponse.json({
      ok: true,
      message: "Atomberg account successfully connected!",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to securely save credentials. Please try again." },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await getSessionFromCookie(req);
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    await db
      .delete(atombergConnections)
      .where(eq(atombergConnections.userId, session.userId));

    invalidateAccessToken(session.userId);
    invalidateFanState(session.userId);

    return NextResponse.json({
      ok: true,
      message: "Atomberg account disconnected successfully.",
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: "Failed to disconnect account." },
      { status: 500 }
    );
  }
}
