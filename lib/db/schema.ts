import { pgTable, text, timestamp, integer, uuid } from "drizzle-orm/pg-core";

/**
 * Users Table
 * Holds user account records created during signup.
 */
export const users = pgTable("users", {
  id: text("id").primaryKey(), // unique user identifier (uuid)
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

/**
 * Atomberg Connections Table
 * Multi-tenant credential store.
 * Stores authenticated AES-256-GCM encrypted payload and per-record GCM parameters.
 * NO plaintext secret columns.
 */
export const atombergConnections = pgTable("atomberg_connections", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  encCredentials: text("enc_credentials").notNull(),
  iv: text("iv").notNull(),
  authTag: text("auth_tag").notNull(),
  keyVersion: integer("key_version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type AtombergConnection = typeof atombergConnections.$inferSelect;
export type NewAtombergConnection = typeof atombergConnections.$inferInsert;
