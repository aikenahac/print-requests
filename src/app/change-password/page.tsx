import { redirect } from "next/navigation";
import { getActor } from "@/auth";
import { AuthForm } from "@/components/forms";
import { AppShell } from "@/components/app-shell";

export default async function ChangePasswordPage() {
  const actor = await getActor();

  if (!actor) redirect("/sign-in");

  if (actor.mustChangePassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-5">
        <AuthForm mode="change" />
      </div>
    );
  }

  return (
    <AppShell username={actor.username} admin={actor.role === "admin"}>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold">Change password</h1>
          <p className="text-sm text-muted-foreground">
            You will sign in again after changing it.
          </p>
        </div>
        <AuthForm mode="change" />
      </div>
    </AppShell>
  );
}
