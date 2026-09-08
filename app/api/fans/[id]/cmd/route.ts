import { NextRequest, NextResponse } from "next/server";
import { KNOWN_DEVICE_IDS } from "@/lib/fanMeta";
import { sendFanCommand } from "@/lib/atomberg";
import { updateCachedFanOptimistic } from "@/lib/cache";
import { FanAction, FanCommandPayload } from "@/lib/types";

export const dynamic = "force-dynamic";

const ALLOWED_ACTIONS: FanAction[] = ["power", "speed", "led", "sleep", "timer"];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Validate device ID
    if (!id || !KNOWN_DEVICE_IDS.includes(id)) {
      return NextResponse.json(
        { ok: false, error: `Invalid or unrecognized device ID: ${id}` },
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
        // Atomberg cloud API accepts "sleep": true/false
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

    // Dispatch command to Atomberg Cloud API
    const result = await sendFanCommand(id, commandPayload);

    // Update server state cache optimistically so next read reflects this change without an API call
    updateCachedFanOptimistic(id, optimisticUpdates);

    return NextResponse.json({
      ok: true,
      deviceId: id,
      action,
      value,
      response: result.responseData,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Failed to execute fan command";
    const status = message.includes("rate limit") ? 429 : 500;
    return NextResponse.json({ ok: false, error: message }, { status });
  }
}
