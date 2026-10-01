import { AppShell } from "@/components/app-shell"
import { RequestCard } from "@/components/request-card"
import { Badge } from "@/components/ui/badge"
import { requireAdmin } from "@/lib/access"
import { listRequests } from "@/lib/queries"

export default async function AdminPage() {
  const actor = await requireAdmin()
  const all = await listRequests()
  const queued = all.filter((r) => r.status === "queued").sort((a, b) => (a.queuePosition ?? 0) - (b.queuePosition ?? 0))
  const printing = all.filter((r) => r.status === "printing")
  const ready = all.filter((r) => r.status === "ready")
  const history = all.filter((r) => ["completed", "cancelled", "rejected"].includes(r.status))
  return <AppShell username={actor.username} admin><div className="space-y-9"><div><p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Admin workspace</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Print queue</h1><p className="mt-1 text-sm text-muted-foreground">Reorder jobs, start prints, and mark them ready for pickup.</p></div><div className="grid gap-3 sm:grid-cols-3"><Summary label="Waiting" value={queued.length} /><Summary label="Printing" value={printing.length} /><Summary label="Ready" value={ready.length} /></div><Section title="Printing now" requests={printing} /><Section title="Waiting queue" requests={queued} printingActive={printing.length > 0} /><Section title="Ready for pickup" requests={ready} /><Section title="History" requests={history} /></div></AppShell>
}

function Summary({ label, value }: { label: string; value: number }) { return <div className="border bg-card p-5"><p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p><p className="mt-2 text-3xl font-semibold">{value}</p></div> }

function Section({ title, requests, printingActive = false }: { title: string; requests: Awaited<ReturnType<typeof listRequests>>; printingActive?: boolean }) {
  return <section className="space-y-4"><div className="flex items-center gap-3"><h2 className="text-lg font-semibold">{title}</h2><Badge variant="secondary">{requests.length}</Badge></div>{requests.length ? <div className="grid gap-4 lg:grid-cols-2">{requests.map((request) => <RequestCard key={request.id} request={request} admin printingActive={printingActive} />)}</div> : <div className="border border-dashed p-6 text-sm text-muted-foreground">Nothing here yet.</div>}</section>
}
