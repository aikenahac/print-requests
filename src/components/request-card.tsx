import Link from "next/link"
import { ArrowDown, ArrowUp, ExternalLink, Pencil, X } from "lucide-react"
import { cancelRequest, moveRequest, transitionRequest } from "@/app/actions"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import type { RequestStatus } from "@/db/schema"

export type RequestView = {
  id: string; userId: string; username: string; title: string; makerworldUrl: string; quantity: number; notes: string | null; urgent: boolean; urgentReason: string | null; status: RequestStatus; queuePosition: number | null; createdAt: Date;
  filamentChoices: { filamentId: string; name: string }[]
}

const statusLabel: Record<RequestStatus, string> = { queued: "Queued", printing: "Printing now", ready: "Ready for pickup", completed: "Completed", cancelled: "Cancelled", rejected: "Rejected" }

export function RequestCard({ request, admin = false, printingActive = false }: { request: RequestView; admin?: boolean; printingActive?: boolean }) {
  const next: Partial<Record<RequestStatus, { label: string; target: RequestStatus }>> = { queued: { label: "Start printing", target: "printing" }, printing: { label: "Mark ready", target: "ready" }, ready: { label: "Complete", target: "completed" } }
  const nextAction = next[request.status]
  return <Card className="gap-4"><CardHeader className="gap-2"><div className="flex flex-wrap items-start justify-between gap-3"><div><CardTitle className="text-base">{request.title}</CardTitle><p className="mt-1 text-xs text-muted-foreground">{admin ? `Requested by ${request.username} · ` : ""}{request.quantity} {request.quantity === 1 ? "copy" : "copies"} · {request.createdAt.toLocaleDateString()}</p></div><div className="flex flex-wrap gap-2"><Badge variant={request.status === "rejected" || request.status === "cancelled" ? "destructive" : request.status === "queued" ? "secondary" : "default"}>{statusLabel[request.status]}</Badge>{request.urgent && <Badge variant="outline">Urgent</Badge>}{request.status === "queued" && request.queuePosition !== null && <Badge variant="outline">#{request.queuePosition} in queue</Badge>}</div></div></CardHeader><CardContent className="space-y-3 text-sm"><div className="flex flex-wrap gap-1">{request.filamentChoices.map((f) => <Badge key={f.filamentId} variant="outline">{f.name}</Badge>)}</div>{request.notes && <p className="text-muted-foreground">{request.notes}</p>}{request.urgent && request.urgentReason && <p className="border-l-2 border-primary pl-3"><span className="font-medium">Urgent reason:</span> {request.urgentReason}</p>}<Button variant="link" size="sm" className="px-0" nativeButton={false} render={<a href={request.makerworldUrl} target="_blank" rel="noopener noreferrer" />}>Open MakerWorld model <ExternalLink /></Button></CardContent><CardFooter className="flex flex-wrap gap-2">
    {admin && request.status === "queued" && <><form action={moveRequest}><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="direction" value="up" /><Button type="submit" variant="outline" size="sm" disabled={request.queuePosition === 1}><ArrowUp /> Move up</Button></form><form action={moveRequest}><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="direction" value="down" /><Button type="submit" variant="outline" size="sm"><ArrowDown /> Move down</Button></form></>}
    {admin && nextAction && <form action={transitionRequest}><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="target" value={nextAction.target} /><Button type="submit" size="sm" disabled={nextAction.target === "printing" && printingActive}>{nextAction.label}</Button></form>}
    {admin && request.status === "queued" && <form action={transitionRequest}><input type="hidden" name="requestId" value={request.id} /><input type="hidden" name="target" value="rejected" /><Button type="submit" variant="destructive" size="sm">Reject</Button></form>}
    {!admin && request.status === "queued" && <><Button variant="outline" size="sm" nativeButton={false} render={<Link href={`/requests/${request.id}/edit`} />}><Pencil /> Edit</Button><form action={cancelRequest}><input type="hidden" name="requestId" value={request.id} /><Button type="submit" variant="destructive" size="sm"><X /> Cancel</Button></form></>}
  </CardFooter></Card>
}
