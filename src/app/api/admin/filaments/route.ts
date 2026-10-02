import { randomUUID } from "node:crypto";
import { unlink } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getActor } from "@/auth";
import { db } from "@/db";
import { filaments } from "@/db/schema";
import { saveFilamentImage } from "@/lib/filament-image";

export const runtime = "nodejs";

const MAX_BODY_SIZE = 6_000_000;

function errorResponse(error: string, status: number) {
  return Response.json({ error }, { status });
}

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !host) return false;
  try {
    const protocol =
      request.headers.get("x-forwarded-proto") ??
      new URL(request.url).protocol.slice(0, -1);
    return new URL(origin).origin === `${protocol}://${host}`;
  } catch {
    return false;
  }
}

async function limitedFormData(request: Request) {
  const type = request.headers.get("content-type");
  if (!type?.toLowerCase().startsWith("multipart/form-data;"))
    return { error: errorResponse("Expected a multipart form upload.", 415) };
  const length = Number(request.headers.get("content-length"));
  if (Number.isFinite(length) && length > MAX_BODY_SIZE)
    return {
      error: errorResponse(
        "Upload must be 6 MB or smaller, including form data.",
        413,
      ),
    };
  if (!request.body) return { error: errorResponse("Upload is empty.", 400) };

  try {
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > MAX_BODY_SIZE) {
        await reader.cancel();
        return {
          error: errorResponse(
            "Upload must be 6 MB or smaller, including form data.",
            413,
          ),
        };
      }
      chunks.push(value);
    }
    const body = Buffer.concat(chunks, size);
    return {
      form: await new Request(request.url, {
        method: "POST",
        headers: { "content-type": type },
        body,
      }).formData(),
    };
  } catch {
    return {
      error: errorResponse("Could not read the upload. Please try again.", 400),
    };
  }
}

export async function POST(request: Request) {
  const actor = await getActor();
  if (!actor) return errorResponse("Sign in to upload a filament.", 401);
  if (actor.role !== "admin" || actor.mustChangePassword)
    return errorResponse("Only an admin can save filaments.", 403);
  if (!sameOrigin(request))
    return errorResponse("Invalid request origin.", 403);

  const parsed = await limitedFormData(request);
  if (parsed.error) return parsed.error;
  const form = parsed.form!;
  const nameValue = form.get("name");
  const name = typeof nameValue === "string" ? nameValue.trim() : "";
  const idValue = form.get("filamentId");
  const id = typeof idValue === "string" ? idValue : "";
  const file = form.get("image");
  if (name.length < 2 || name.length > 80)
    return errorResponse("Filament name must be 2–80 characters.", 400);
  if (file !== null && !(file instanceof File))
    return errorResponse("Upload a PNG, JPEG, or WebP image.", 400);

  const [existing] = id
    ? await db.select().from(filaments).where(eq(filaments.id, id)).limit(1)
    : [];
  if (id && !existing) return errorResponse("Filament was not found.", 404);

  let imagePath: string | null = null;
  try {
    if (file instanceof File) imagePath = await saveFilamentImage(file);
  } catch (error) {
    if (
      error instanceof Error &&
      [
        "Image must be 5 MB or smaller.",
        "Upload a PNG, JPEG, or WebP image.",
      ].includes(error.message)
    ) {
      return errorResponse(error.message, 400);
    }
    return errorResponse("Could not save the image. Please try again.", 500);
  }

  try {
    if (existing) {
      await db
        .update(filaments)
        .set({
          name,
          available: form.get("available") === "on",
          imagePath: imagePath ?? existing.imagePath,
        })
        .where(eq(filaments.id, id));
    } else {
      await db
        .insert(filaments)
        .values({
          id: randomUUID(),
          name,
          imagePath,
          available: true,
          createdAt: new Date(),
        });
    }
  } catch {
    if (imagePath)
      await unlink(
        path.join(
          path.resolve(process.env.UPLOAD_DIR ?? "./data/uploads"),
          imagePath,
        ),
      ).catch(() => {});
    return errorResponse("Could not save the filament. Please try again.", 500);
  }

  revalidatePath("/admin/filaments");
  revalidatePath("/requests/new");
  return Response.json({ ok: true });
}
