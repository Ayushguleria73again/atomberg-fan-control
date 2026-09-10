import { NextRequest, NextResponse } from "next/server";
import { getFansStateForUser } from "@/lib/atomberg";
import { getSessionFromCookie } from "@/lib/auth/session";
import { checkFansPollRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSessionFromCookie(request);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  // Rate limit: 30 fan polls per 60s per user
  const ratelimit = await checkFansPollRateLimit(session.userId);
  if (!ratelimit.success) {
    return NextResponse.json(
      {
        error: "Rate limit reached. Please wait a moment before refreshing fans.",
        fans: [],
        cached: false,
        cachedAt: Date.now(),
      },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil((ratelimit.reset - Date.now()) / 1000).toString(),
        },
      }
    );
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const forceRefresh =
      searchParams.get("refresh") === "1" ||
      searchParams.get("refresh") === "true";

    const data = await getFansStateForUser(session.userId, forceRefresh);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve fans state";
    
    // If user hasn't connected credentials yet
    if (message.includes("No connected Atomberg account found")) {
      return NextResponse.json(
        {
          notConnected: true,
          error: message,
          fans: [],
          cached: false,
          cachedAt: Date.now(),
        },
        { status: 400 }
      );
    }

    const status = message.includes("rate limit") ? 429 : 500;
    return NextResponse.json(
      {
        error: message,
        fans: [],
        cached: false,
        cachedAt: Date.now(),
      },
      { status }
    );
  }
}
