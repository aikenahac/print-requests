import "server-only"

import { asc, desc, eq } from "drizzle-orm"
import { db } from "@/db"
import { filaments, requestFilaments, requests, users } from "@/db/schema"

export async function listFilaments() {
  return db.select().from(filaments).orderBy(asc(filaments.name))
}

export async function listUsers() {
  return db.select({ id: users.id, username: users.username, role: users.role, mustChangePassword: users.mustChangePassword, createdAt: users.createdAt }).from(users).orderBy(asc(users.username))
}

export async function listRequests(userId?: string) {
  const rows = await db.select({ request: requests, username: users.username }).from(requests).innerJoin(users, eq(requests.userId, users.id)).where(userId ? eq(requests.userId, userId) : undefined).orderBy(desc(requests.createdAt))
  const choices = await db.select({ requestId: requestFilaments.requestId, position: requestFilaments.position, filamentId: filaments.id, name: filaments.name, imagePath: filaments.imagePath }).from(requestFilaments).innerJoin(filaments, eq(requestFilaments.filamentId, filaments.id)).orderBy(asc(requestFilaments.position))
  const byRequest = new Map<string, typeof choices>()
  for (const choice of choices) byRequest.set(choice.requestId, [...(byRequest.get(choice.requestId) ?? []), choice])
  return rows.map((row) => ({ ...row.request, username: row.username, filamentChoices: byRequest.get(row.request.id) ?? [] }))
}
