import { redirect } from "next/navigation";
import { getActor } from "@/auth";

export async function requireUser() {
  const user = await getActor();
  if (!user) redirect("/sign-in");
  if (user.mustChangePassword) redirect("/change-password");
  return user;
}

export async function requireAdmin() {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/");
  return user;
}
