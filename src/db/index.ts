import "server-only"

import { createClient } from "@libsql/client"
import { drizzle } from "drizzle-orm/libsql"

const url = process.env.DB_FILE_NAME
if (!url) throw new Error("DB_FILE_NAME is required")

export const client = createClient({ url })
export const db = drizzle({ client })
