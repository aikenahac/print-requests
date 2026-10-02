import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import type { db } from "@/db";

export async function claimFirstAdmin(
  database: typeof db,
  username: string,
  passwordHash: string,
) {
  const result =
    await database.run(sql`insert into users (id, username, password_hash, role, must_change_password, credential_version, created_at)
    select ${randomUUID()}, ${username}, ${passwordHash}, 'admin', 0, 0, ${Date.now()}
    where not exists (select 1 from users)`);
  return result.rowsAffected === 1;
}
