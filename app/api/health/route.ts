import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    // Health check: verifies DB connectivity
    await db.execute(sql`SELECT 1`);
    return NextResponse.json({
      status: "ok",
      database: "connected",
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
