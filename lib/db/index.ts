import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "./schema";

function createDbClient() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return null;
  }

  const sql = neon(databaseUrl);
  return drizzle(sql, { schema });
}

export const db = createDbClient();
export * from "./schema";
