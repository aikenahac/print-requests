import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import type { db } from "@/db";
import { requestFilaments, requests, type RequestStatus } from "@/db/schema";
import type { RequestInput } from "@/lib/validation";

export async function enqueueRequest(
  database: typeof db,
  userId: string,
  input: RequestInput,
) {
  return database.transaction(async (tx) => {
    const [last] = await tx
      .select({
        position: sql<number>`coalesce(max(${requests.queuePosition}), 0)`,
      })
      .from(requests)
      .where(eq(requests.status, "queued"));
    const id = randomUUID();
    const now = new Date();
    await tx
      .insert(requests)
      .values({
        id,
        userId,
        ...input,
        status: "queued",
        queuePosition: Number(last.position) + 1,
        createdAt: now,
        updatedAt: now,
      });
    await tx
      .insert(requestFilaments)
      .values(
        input.filamentIds.map((filamentId, position) => ({
          requestId: id,
          filamentId,
          position,
        })),
      );
    return id;
  });
}

export async function editQueuedRequest(
  database: typeof db,
  id: string,
  userId: string,
  input: RequestInput,
) {
  return database.transaction(async (tx) => {
    const updated = await tx
      .update(requests)
      .set({ ...input, updatedAt: new Date() })
      .where(
        and(
          eq(requests.id, id),
          eq(requests.userId, userId),
          eq(requests.status, "queued"),
        ),
      );
    if (updated.rowsAffected !== 1) return false;
    await tx.delete(requestFilaments).where(eq(requestFilaments.requestId, id));
    await tx
      .insert(requestFilaments)
      .values(
        input.filamentIds.map((filamentId, position) => ({
          requestId: id,
          filamentId,
          position,
        })),
      );
    return true;
  });
}

export async function cancelQueuedRequest(
  database: typeof db,
  id: string,
  userId: string,
) {
  return database.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(requests)
      .where(
        and(
          eq(requests.id, id),
          eq(requests.userId, userId),
          eq(requests.status, "queued"),
        ),
      )
      .limit(1);
    if (!request || request.queuePosition === null) return false;
    await tx
      .update(requests)
      .set({ status: "cancelled", queuePosition: null, updatedAt: new Date() })
      .where(eq(requests.id, id));
    await tx
      .update(requests)
      .set({ queuePosition: sql`${requests.queuePosition} - 1` })
      .where(
        and(
          eq(requests.status, "queued"),
          sql`${requests.queuePosition} > ${request.queuePosition}`,
        ),
      );
    return true;
  });
}

export async function moveQueuedRequest(
  database: typeof db,
  id: string,
  direction: "up" | "down",
) {
  return database.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(requests)
      .where(and(eq(requests.id, id), eq(requests.status, "queued")))
      .limit(1);
    if (!request || request.queuePosition === null) return false;
    const next = request.queuePosition + (direction === "up" ? -1 : 1);
    const [neighbor] = await tx
      .select()
      .from(requests)
      .where(
        and(eq(requests.status, "queued"), eq(requests.queuePosition, next)),
      )
      .limit(1);
    if (!neighbor) return false;
    await tx
      .update(requests)
      .set({ queuePosition: next })
      .where(eq(requests.id, id));
    await tx
      .update(requests)
      .set({ queuePosition: request.queuePosition })
      .where(eq(requests.id, neighbor.id));
    return true;
  });
}

export async function transitionQueuedRequest(
  database: typeof db,
  id: string,
  target: RequestStatus,
) {
  const allowed: Partial<Record<RequestStatus, Array<RequestStatus>>> = {
    queued: ["printing", "rejected"],
    printing: ["ready"],
    ready: ["completed"],
  };
  return database.transaction(async (tx) => {
    const [request] = await tx
      .select()
      .from(requests)
      .where(eq(requests.id, id))
      .limit(1);
    if (!request || !allowed[request.status]?.includes(target)) return false;
    if (target === "printing") {
      const [active] = await tx
        .select({ id: requests.id })
        .from(requests)
        .where(eq(requests.status, "printing"))
        .limit(1);
      if (active) return false;
    }
    await tx
      .update(requests)
      .set({ status: target, queuePosition: null, updatedAt: new Date() })
      .where(eq(requests.id, id));
    if (request.status === "queued" && request.queuePosition !== null) {
      await tx
        .update(requests)
        .set({ queuePosition: sql`${requests.queuePosition} - 1` })
        .where(
          and(
            eq(requests.status, "queued"),
            sql`${requests.queuePosition} > ${request.queuePosition}`,
          ),
        );
    }
    return true;
  });
}
