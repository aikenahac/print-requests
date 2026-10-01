import { AppShell } from "@/components/app-shell"
import { RequestForm } from "@/components/forms"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requireUser } from "@/lib/access"
import { listFilaments } from "@/lib/queries"

export default async function NewRequestPage() {
  const actor = await requireUser()
  const filaments = (await listFilaments()).filter((f) => f.available)
  return <AppShell username={actor.username} admin={actor.role === "admin"}><div className="mx-auto max-w-3xl space-y-6"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">New print</p><h1 className="mt-2 text-3xl font-semibold">Add a request</h1><p className="mt-1 text-sm text-muted-foreground">Your request joins the queue as soon as you submit it.</p></div><Card><CardHeader><CardTitle>Print details</CardTitle></CardHeader><CardContent>{filaments.length ? <RequestForm filaments={filaments} /> : <p className="text-sm text-muted-foreground">No filaments are available yet. Please ask the admin to add one.</p>}</CardContent></Card></div></AppShell>
}
