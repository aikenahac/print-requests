import { sql } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    username: text("username").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: text("role", { enum: ["admin", "user"] }).notNull(),
    mustChangePassword: integer("must_change_password", { mode: "boolean" })
      .notNull()
      .default(false),
    credentialVersion: integer("credential_version").notNull().default(0),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("users_username_lower_unique").on(
      sql`lower(${table.username})`,
    ),
  ],
);

export const filaments = sqliteTable("filaments", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  imagePath: text("image_path"),
  available: integer("available", { mode: "boolean" }).notNull().default(true),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
});

export const requests = sqliteTable(
  "requests",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    title: text("title").notNull(),
    makerworldUrl: text("makerworld_url").notNull(),
    quantity: integer("quantity").notNull(),
    notes: text("notes"),
    urgent: integer("urgent", { mode: "boolean" }).notNull().default(false),
    urgentReason: text("urgent_reason"),
    amsConfirmed: integer("ams_confirmed", { mode: "boolean" })
      .notNull()
      .default(false),
    status: text("status", {
      enum: [
        "queued",
        "printing",
        "ready",
        "completed",
        "cancelled",
        "rejected",
      ],
    })
      .notNull()
      .default("queued"),
    queuePosition: integer("queue_position"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("requests_user_idx").on(table.userId),
    index("requests_queue_idx").on(table.status, table.queuePosition),
  ],
);

export const requestFilaments = sqliteTable(
  "request_filaments",
  {
    requestId: text("request_id")
      .notNull()
      .references(() => requests.id, { onDelete: "cascade" }),
    filamentId: text("filament_id")
      .notNull()
      .references(() => filaments.id),
    position: integer("position").notNull(),
  },
  (table) => [primaryKey({ columns: [table.requestId, table.filamentId] })],
);

export type RequestStatus = typeof requests.$inferSelect.status;
