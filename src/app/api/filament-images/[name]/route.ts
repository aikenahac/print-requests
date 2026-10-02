import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { getActor } from "@/auth";
import { db } from "@/db";
import { filaments } from "@/db/schema";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> },
) {
  const actor = await getActor();

  if (!actor) return new Response("Unauthorized", { status: 401 });

  const { name } = await params;

  if (!/^[0-9a-f-]{36}\.(png|jpg|webp)$/.test(name))
    return new Response("Not found", { status: 404 });

  const [filament] = await db
    .select({ id: filaments.id })
    .from(filaments)
    .where(eq(filaments.imagePath, name))
    .limit(1);

  if (!filament) return new Response("Not found", { status: 404 });

  try {
    const bytes = await readFile(
      path.join(path.resolve(process.env.UPLOAD_DIR ?? "./data/uploads"), name),
    );
    const type = name.endsWith(".png")
      ? "image/png"
      : name.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";

    return new Response(bytes, {
      headers: {
        "Content-Type": type,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
