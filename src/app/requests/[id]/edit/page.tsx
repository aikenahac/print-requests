import { and, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { RequestForm } from "@/components/forms";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db } from "@/db";
import { requests } from "@/db/schema";
import { requireUser } from "@/lib/access";
import { listFilaments, listRequests } from "@/lib/queries";

export default async function EditRequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const actor = await requireUser();
  const { id } = await params;
  const [request] = await db
    .select()
    .from(requests)
    .where(
      and(
        eq(requests.id, id),
        eq(requests.userId, actor.id),
        eq(requests.status, "queued"),
      ),
    )
    .limit(1);
  if (!request) notFound();
  const all = await listRequests(actor.id);
  const current = all.find((r) => r.id === id);
  if (!current) notFound();
  const filaments = (await listFilaments()).filter(
    (f) =>
      f.available ||
      current.filamentChoices.some((choice) => choice.filamentId === f.id),
  );
  return (
    <AppShell username={actor.username} admin={false}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-3xl font-semibold">Edit request</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            You can make changes while this request is queued.
          </p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Print details</CardTitle>
          </CardHeader>
          <CardContent>
            <RequestForm filaments={filaments} initial={current} />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
