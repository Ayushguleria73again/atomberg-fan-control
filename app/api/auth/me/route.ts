import { NextResponse } from "next/server";
import { getServerUserSession } from "@/lib/auth/session";
import { db, atombergConnections } from "@/lib/db";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await getServerUserSession();

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        user: null,
        hasConnection: false,
      });
    }

    let hasConnection = false;

    if (db) {
      const connections = await db
        .select({ id: atombergConnections.id })
        .from(atombergConnections)
        .where(eq(atombergConnections.userId, session.userId))
        .limit(1);

      hasConnection = connections.length > 0;
    }

    return NextResponse.json({
      authenticated: true,
      user: {
        id: session.userId,
        email: session.email,
        name: session.name,
      },
      hasConnection,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Error checking auth status";
    return NextResponse.json({ authenticated: false, error: message }, { status: 500 });
  }
}
