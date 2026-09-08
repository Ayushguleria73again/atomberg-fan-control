import { NextRequest, NextResponse } from "next/server";
import { sendFanCommandForUser } from "@/lib/atomberg";
import { updateCachedFanOptimistic } from "@/lib/cache";
import { FanAction, FanCommandPayload } from "@/lib/types";
import { getSessionFromCookie } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS: FanAction[] = ["power", "speed", "led", "sleep", "timer"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSessionFromCookie(request);
  if (!session) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    if (!id || typeof id !== "string") {
      return NextResponse.json(
        { ok: false, error: "Device ID is required" },
        { status: 400 }
      );
    }

    const body = (await request.json().catch(() => null)) as FanCommandPayload | null;

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body. Expected { action, value }." },
        { status: 400 }
      );
    }

    const { action, value } = body;

    if (!ALLOWED_ACTIONS.includes(action)) {
      return NextResponse.json(
        {
          ok: false,
          error: `Invalid action: ${action}. Allowed: ${ALLOWED_ACTIONS.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Build Atomberg command payload with strict validation
    const commandPayload: Record<string, unknown> = {};
    const optimisticUpdates: Record<string, unknown> = {};

    switch (action) {
      case "power": {
        if (typeof value !== "boolean") {
          return NextResponse.json(
            { ok: false, error: "Power value must be a boolean (true/false)." },
            { status: 400 }
          );
        }
        commandPayload.power = value;
        optimisticUpdates.power = value;
        break;
      }

      case "speed": {
        const num = Number(value);
        if (!Number.isInteger(num) || num < 1 || num > 6) {
          return NextResponse.json(
            { ok: false, error: "Speed value must be an integer between 1 and 6." },
            { status: 400 }
          );
        }
        commandPayload.speed = num;
        optimisticUpdates.speed = num;
        // Setting speed implies fan is powered on
        optimisticUpdates.power = true;
        break;
      }

      case "led": {
        if (typeof value !== "boolean") {
          return NextResponse.json(
            { ok: false, error: "LED value must be a boolean (true/false)." },
            { status: 400 }
          );
        }
        commandPayload.led = value;
        optimisticUpdates.led = value;
        break;
      }

      case "sleep": {
        if (typeof value !== "boolean") {
          return NextResponse.json(
            { ok: false, error: "Sleep value must be a boolean (true/false)." },
            { status: 400 }
          );
        }
        commandPayload.sleep = value;
        optimisticUpdates.sleep = value;
        break;
      }

      case "timer": {
        const num = Number(value);
        if (!Number.isInteger(num) || num < 0 || num > 6) {
          return NextResponse.json(
            { ok: false, error: "Timer value must be an integer (0 for off, or 1..6)." },
            { status: 400 }
          );
        }
        commandPayload.timer = num;
        optimisticUpdates.timerHours = num;
        break;
      }
    }

    // Dispatch command to Atomberg Cloud API with user ownership check
    const result = await sendFanCommandForUser(session.userId, id, commandPayload);

    // Update server state cache optimistically
    updateCachedFanOptimistic(session.userId, id, optimisticUpdates);

    return NextResponse.json({
      ok: true,
      deviceId: id,
      action,
      value,
      response: result.responseData,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to execute fan command";
    let status = 500;
    if (message.includes("Forbidden")) status = 403;
    else if (message.includes("rate limit")) status = 429;
    else if (message.includes("No connected Atomberg account")) status = 400;

    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
