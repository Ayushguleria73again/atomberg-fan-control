import { NextRequest, NextResponse } from "next/server";
import { getSessionFromCookie } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { userDevices } from "@/lib/db/schema";
import { and, eq } from "drizzle-orm";
import { invalidateFanState } from "@/lib/cache";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSessionFromCookie(req);
    if (!session) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id: deviceId } = await params;
    if (!deviceId) {
      return NextResponse.json({ ok: false, error: "Device ID required" }, { status: 400 });
    }

    let body: {
      customName?: string;
      hidden?: boolean;
      isNew?: boolean;
      room?: string;
    };
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ ok: false, error: "Invalid JSON payload" }, { status: 400 });
    }

    const updates: Partial<{
      customName: string | null;
      hidden: boolean;
      isNew: boolean;
      room: string;
    }> = {};

    if (body.customName !== undefined) {
      updates.customName = body.customName.trim() ? body.customName.trim() : null;
    }
    if (body.hidden !== undefined) {
      updates.hidden = Boolean(body.hidden);
    }
    if (body.isNew !== undefined) {
      updates.isNew = Boolean(body.isNew);
    }
    if (body.room !== undefined && body.room.trim()) {
      updates.room = body.room.trim();
    }

    const res = await db
      .update(userDevices)
      .set(updates)
      .where(
        and(
          eq(userDevices.userId, session.userId),
          eq(userDevices.deviceId, deviceId)
        )
      )
      .returning();

    if (!res.length) {
      return NextResponse.json(
        { ok: false, error: "Device not found in your account" },
        { status: 404 }
      );
    }

    invalidateFanState(session.userId);

    return NextResponse.json({
      ok: true,
      device: res[0],
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to update device";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
