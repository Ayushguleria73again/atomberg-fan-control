import { NextRequest, NextResponse } from "next/server";
import { getFansState } from "@/lib/atomberg";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const forceRefresh =
      searchParams.get("refresh") === "1" ||
      searchParams.get("refresh") === "true";

    const data = await getFansState(forceRefresh);
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to retrieve fans state";
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
