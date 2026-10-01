import Link from "next/link"
import { connection } from "next/server"
import { count } from "drizzle-orm"
import { redirect } from "next/navigation"
import { getActor } from "@/auth"
import { AppShell } from "@/components/app-shell"
import { RequestCard } from "@/components/request-card"
import { Button } from "@/components/ui/button"
import { db } from "@/db"
import { users } from "@/db/schema"
import { listRequests } from "@/lib/queries"

export default async function Page() {
  await connection()
  const [row] = await db.select({ count: count() }).from(users)
  if (row.count === 0) redirect("/setup")
  const actor = await getActor()
  if (!actor) redirect("/sign-in")
  if (actor.mustChangePassword) redirect("/change-password")
  if (actor.role === "admin") redirect("/admin")
  const requests = await listRequests(actor.id)
  const queued = requests.filter((r) => r.status === "queued").sort((a, b) => (a.queuePosition ?? 0) - (b.queuePosition ?? 0))
  const other = requests.filter((r) => r.status !== "queued")
  return <AppShell username={actor.username} admin={false}><div className="space-y-8"><div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Your print desk</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">My requests</h1><p className="mt-1 text-sm text-muted-foreground">Follow your prints from queue to pickup.</p></div><Button size="lg" nativeButton={false} render={<Link href="/requests/new" />}>+ New print request</Button></div>{queued.length > 0 && <section className="space-y-4"><h2 className="text-lg font-semibold">In the queue <span className="text-sm font-normal text-muted-foreground">({queued.length})</span></h2><div className="grid gap-4 lg:grid-cols-2">{queued.map((r) => <RequestCard key={r.id} request={r} />)}</div></section>}{other.length > 0 && <section className="space-y-4"><h2 className="text-lg font-semibold">Other requests</h2><div className="grid gap-4 lg:grid-cols-2">{other.map((r) => <RequestCard key={r.id} request={r} />)}</div></section>}{requests.length === 0 && <div className="border border-dashed p-10 text-center"><h2 className="text-lg font-medium">No requests yet</h2><p className="mt-2 text-sm text-muted-foreground">Found something on MakerWorld? Add it to the queue.</p><Button className="mt-5" nativeButton={false} render={<Link href="/requests/new" />}>Create your first request</Button></div>}</div></AppShell>
}
