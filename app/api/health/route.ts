import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/atomberg";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Verifies that credentials exist and can generate/retrieve an access token
    const token = await getAccessToken();
    return NextResponse.json({
      status: "ok",
      authenticated: Boolean(token),
      timestamp: Date.now(),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Health check failed";
    return NextResponse.json(
      {
        status: "error",
        error: message,
        timestamp: Date.now(),
      },
      { status: 500 }
    );
  }
}
