"use server";

import { randomUUID } from "node:crypto";
import { AuthError } from "next-auth";
import { and, eq, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActor, signIn, signOut } from "@/auth";
import { db } from "@/db";
import {
  filaments,
  requestFilaments,
  users,
  type RequestStatus,
} from "@/db/schema";
import { requireAdmin, requireUser } from "@/lib/access";
import {
  hashPassword,
  newPasswordError,
  validPassword,
  verifyPassword,
} from "@/lib/password";
import { parseRequestForm, validUsername } from "@/lib/validation";
import { claimFirstAdmin } from "@/lib/setup";
import {
  cancelQueuedRequest,
  editQueuedRequest,
  enqueueRequest,
  moveQueuedRequest,
  transitionQueuedRequest,
} from "@/lib/queue";

type State = { error: string; success?: string };
const fail = (error: string): State => ({ error });

export async function setupAdmin(
  _state: State,
  form: FormData,
): Promise<State> {
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  const confirmation = String(form.get("confirmPassword") ?? "");
  if (!validUsername(username))
    return fail(
      "Use 3–32 letters, numbers, underscores, or hyphens for the username.",
    );
  const passwordError = newPasswordError(password, confirmation);
  if (passwordError) return fail(passwordError);
  const passwordHash = await hashPassword(password);
  if (!(await claimFirstAdmin(db, username, passwordHash)))
    return fail("Setup has already been completed. Sign in instead.");
  redirect("/sign-in");
}

export async function login(_state: State, form: FormData): Promise<State> {
  try {
    await signIn("credentials", {
      username: String(form.get("username") ?? ""),
      password: String(form.get("password") ?? ""),
      redirectTo: "/",
    });
  } catch (error) {
    if (error instanceof AuthError)
      return fail("Invalid username or password.");
    throw error;
  }
  return fail("");
}

export async function logout() {
  await signOut({ redirectTo: "/sign-in" });
}

export async function changePassword(
  _state: State,
  form: FormData,
): Promise<State> {
  const actor = await getActor();
  if (!actor) redirect("/sign-in");
  const oldPassword = String(form.get("oldPassword") ?? "");
  const newPassword = String(form.get("newPassword") ?? "");
  const confirmation = String(form.get("confirmPassword") ?? "");
  if (!(await verifyPassword(oldPassword, actor.passwordHash)))
    return fail("Current password is incorrect.");
  const passwordError = newPasswordError(newPassword, confirmation);
  if (passwordError) return fail(passwordError);
  if (oldPassword === newPassword) return fail("Choose a different password.");
  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(newPassword),
      mustChangePassword: false,
      credentialVersion: actor.credentialVersion + 1,
    })
    .where(eq(users.id, actor.id));
  await signOut({ redirectTo: "/sign-in" });
  return fail("");
}

export async function createUser(
  _state: State,
  form: FormData,
): Promise<State> {
  await requireAdmin();
  const username = String(form.get("username") ?? "").trim();
  const password = String(form.get("password") ?? "");
  if (!validUsername(username))
    return fail(
      "Use 3–32 letters, numbers, underscores, or hyphens for the username.",
    );
  if (!validPassword(password))
    return fail("Temporary password must be 12–128 characters.");
  try {
    await db
      .insert(users)
      .values({
        id: randomUUID(),
        username,
        passwordHash: await hashPassword(password),
        role: "user",
        mustChangePassword: true,
        createdAt: new Date(),
      });
  } catch (error) {
    if (String(error).includes("UNIQUE"))
      return fail("That username is already taken.");
    throw error;
  }
  revalidatePath("/admin/users");
  redirect("/admin/users?created=1");
}

export async function resetUserPassword(
  _state: State,
  form: FormData,
): Promise<State> {
  await requireAdmin();
  const id = String(form.get("userId") ?? "");
  const password = String(form.get("password") ?? "");
  if (!validPassword(password))
    return fail("Temporary password must be 12–128 characters.");
  const result = await db
    .update(users)
    .set({
      passwordHash: await hashPassword(password),
      mustChangePassword: true,
      credentialVersion: sql`${users.credentialVersion} + 1`,
    })
    .where(and(eq(users.id, id), eq(users.role, "user")));
  if (result.rowsAffected !== 1) return fail("User was not found.");
  revalidatePath("/admin/users");
  return {
    error: "",
    success: "Password reset. Share the new temporary password privately.",
  };
}

async function checkFilaments(ids: string[], existingRequestId?: string) {
  const available = await db
    .select({ id: filaments.id })
    .from(filaments)
    .where(and(inArray(filaments.id, ids), eq(filaments.available, true)));
  const allowed = new Set(available.map((f) => f.id));
  if (existingRequestId) {
    const existing = await db
      .select({ filamentId: requestFilaments.filamentId })
      .from(requestFilaments)
      .where(eq(requestFilaments.requestId, existingRequestId));
    for (const row of existing) allowed.add(row.filamentId);
  }
  return ids.every((id) => allowed.has(id));
}

export async function createRequest(
  _state: State,
  form: FormData,
): Promise<State> {
  const actor = await requireUser();
  const input = parseRequestForm(form);
  if (typeof input === "string") return fail(input);
  if (!(await checkFilaments(input.filamentIds)))
    return fail("One or more chosen filaments are no longer available.");
  await enqueueRequest(db, actor.id, input);
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/?submitted=1");
}

export async function editRequest(
  _state: State,
  form: FormData,
): Promise<State> {
  const actor = await requireUser();
  const id = String(form.get("requestId") ?? "");
  const input = parseRequestForm(form);
  if (typeof input === "string") return fail(input);
  if (!(await checkFilaments(input.filamentIds, id)))
    return fail("One or more chosen filaments are no longer available.");
  const result = await editQueuedRequest(db, id, actor.id, input);
  if (!result) return fail("This request can no longer be edited.");
  revalidatePath("/");
  revalidatePath("/admin");
  redirect("/?updated=1");
}

export async function cancelRequest(form: FormData) {
  const actor = await requireUser();
  const id = String(form.get("requestId") ?? "");
  await cancelQueuedRequest(db, id, actor.id);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function moveRequest(form: FormData) {
  await requireAdmin();
  const id = String(form.get("requestId") ?? "");
  const direction = String(form.get("direction") ?? "");
  if (direction !== "up" && direction !== "down") return;
  await moveQueuedRequest(db, id, direction);
  revalidatePath("/");
  revalidatePath("/admin");
}

export async function transitionRequest(form: FormData) {
  await requireAdmin();
  const id = String(form.get("requestId") ?? "");
  const target = String(form.get("target") ?? "") as RequestStatus;
  await transitionQueuedRequest(db, id, target);
  revalidatePath("/");
  revalidatePath("/admin");
}
