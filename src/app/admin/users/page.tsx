import { AppShell } from "@/components/app-shell";
import { CreateUserForm, ResetPasswordForm } from "@/components/forms";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { requireAdmin } from "@/lib/access";
import { listUsers } from "@/lib/queries";

export default async function UsersPage() {
  const actor = await requireAdmin();
  const users = await listUsers();
  return (
    <AppShell username={actor.username} admin>
      <div className="space-y-7">
        <div>
          <p className="text-xs font-semibold tracking-[.2em] text-primary uppercase">
            Access
          </p>
          <h1 className="mt-2 text-3xl font-semibold">Friends</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Only accounts you create can submit print requests.
          </p>
        </div>
        <CreateUserForm />
        <Card>
          <CardHeader>
            <CardTitle>Accounts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {users.map((user) => (
              <div
                key={user.id}
                className="space-y-3 border-b pb-5 last:border-0 last:pb-0"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <strong className="text-sm">{user.username}</strong>
                  <Badge variant="outline">{user.role}</Badge>
                  {user.mustChangePassword && (
                    <Badge variant="secondary">Password change required</Badge>
                  )}
                </div>
                {user.role === "user" && <ResetPasswordForm userId={user.id} />}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
