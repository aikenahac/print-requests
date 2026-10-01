import { count } from "drizzle-orm"
import { redirect } from "next/navigation"
import { connection } from "next/server"
import { getActor } from "@/auth"
import { AuthForm } from "@/components/forms"
import { db } from "@/db"
import { users } from "@/db/schema"

export default async function SignInPage() {
  await connection()
  const [row] = await db.select({ count: count() }).from(users)
  if (row.count === 0) redirect("/setup")
  const actor = await getActor()
  if (actor) redirect(actor.mustChangePassword ? "/change-password" : actor.role === "admin" ? "/admin" : "/")
  return <div className="flex min-h-screen items-center justify-center bg-muted/30 p-5"><AuthForm mode="login" /></div>
}
