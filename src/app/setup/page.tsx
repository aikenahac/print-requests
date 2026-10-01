import { count } from "drizzle-orm"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { db } from "@/db"
import { users } from "@/db/schema"
import { AuthForm } from "@/components/forms"

export default async function SetupPage() {
  await connection()
  const [row] = await db.select({ count: count() }).from(users)
  if (row.count > 0) redirect("/sign-in")
  return <div className="flex min-h-screen items-center justify-center bg-muted/30 p-5"><AuthForm mode="setup" /></div>
}
