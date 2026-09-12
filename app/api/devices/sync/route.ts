import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { syncUserDevices } from "@/lib/atomberg";
import { invalidateFanState } from "@/lib/cache";

export async function POST(req: NextRequest) {
  try {
    const session = await getSessionFromCookie(req);
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const result = await syncUserDevices(session.userId);
    invalidateFanState(session.userId);

    return NextResponse.json({
      ok: true,
      added: result.added,
      total: result.total,
      count: result.count,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to sync devices";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
