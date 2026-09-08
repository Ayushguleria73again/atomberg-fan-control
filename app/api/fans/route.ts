import { NextRequest, NextResponse } from "next/server";
import { getFansStateForUser } from "@/lib/atomberg";
import { getSessionFromCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getSessionFromCookie(request);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
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
