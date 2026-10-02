import { afterAll, beforeAll, beforeEach, expect, mock, test } from "bun:test";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { eq } from "drizzle-orm";
import { filaments } from "../src/db/schema";

const directory = await mkdtemp(
  path.join(tmpdir(), "print-queue-upload-route-"),
);
const client = createClient({ url: `file:${path.join(directory, "test.db")}` });
const db = drizzle({ client });
let actor: { role: string; mustChangePassword: boolean } | null = {
  role: "admin",
  mustChangePassword: false,
};

mock.module("@/auth", () => ({ getActor: async () => actor }));
mock.module("@/db", () => ({ db }));
mock.module("next/cache", () => ({ revalidatePath: () => {} }));

const { POST } = await import("../src/app/api/admin/filaments/route");
const { GET: getImage } =
  await import("../src/app/api/filament-images/[name]/route");
const png = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z5S8AAAAASUVORK5CYII=",
  "base64",
);

beforeAll(async () => {
  const migration = await readFile(
    path.join(
      process.cwd(),
      "drizzle/20261001134207_stale_marten_broadcloak/migration.sql",
    ),
    "utf8",
  );
  await client.executeMultiple(migration);
  process.env.UPLOAD_DIR = path.join(directory, "uploads");
});

beforeEach(async () => {
  actor = { role: "admin", mustChangePassword: false };
  await db.delete(filaments);
  await rm(path.join(directory, "uploads"), { recursive: true, force: true });
});

afterAll(async () => {
  client.close();
  delete process.env.UPLOAD_DIR;
  await rm(directory, { recursive: true, force: true });
});

function upload(form: FormData, origin = "https://prints.aiken.si") {
  return POST(
    new Request("https://prints.aiken.si/api/admin/filaments", {
      method: "POST",
      headers: { origin, host: "prints.aiken.si" },
      body: form,
    }),
  );
}

function form(name: string, image?: File) {
  const data = new FormData();
  data.set("name", name);
  if (image) data.set("image", image);
  return data;
}

test("creates and edits a filament without an image", async () => {
  expect((await upload(form("Purple PLA"))).status).toBe(200);
  const [created] = await db.select().from(filaments);
  expect(created.name).toBe("Purple PLA");
  expect(created.imagePath).toBeNull();

  const edit = form("Purple PLA Matte");
  edit.set("filamentId", created.id);
  edit.set("available", "on");
  expect((await upload(edit)).status).toBe(200);
  const [updated] = await db
    .select()
    .from(filaments)
    .where(eq(filaments.id, created.id));
  expect(updated.name).toBe("Purple PLA Matte");
});

test("saves small and near-limit images", async () => {
  for (const [name, bytes] of [
    ["Small", png],
    ["Near limit", Buffer.concat([png, Buffer.alloc(4_999_000 - png.length)])],
  ] as const) {
    const response = await upload(
      form(name, new File([bytes], "photo.png", { type: "image/png" })),
    );
    expect(response.status).toBe(200);
    const [saved] = await db
      .select()
      .from(filaments)
      .where(eq(filaments.name, name));
    expect(saved.imagePath).toMatch(/\.png$/);
    expect(
      await readFile(path.join(directory, "uploads", saved.imagePath!)),
    ).toEqual(bytes);
    const image = await getImage(
      new Request(
        `https://prints.aiken.si/api/filament-images/${saved.imagePath}`,
      ),
      { params: Promise.resolve({ name: saved.imagePath! }) },
    );
    expect(image.status).toBe(200);
    expect(image.headers.get("content-type")).toBe("image/png");
    expect(Buffer.from(await image.arrayBuffer())).toEqual(bytes);
  }
});

test("rejects oversized and invalid images without saving a filament", async () => {
  const oversized = await upload(
    form(
      "Too big",
      new File([Buffer.alloc(5_000_001)], "photo.png", { type: "image/png" }),
    ),
  );
  expect(oversized.status).toBe(400);
  expect((await oversized.json()).error).toBe("Image must be 5 MB or smaller.");
  const invalid = await upload(
    form(
      "Invalid",
      new File(["not an image"], "photo.png", { type: "image/png" }),
    ),
  );
  expect(invalid.status).toBe(400);
  expect((await invalid.json()).error).toBe(
    "Upload a PNG, JPEG, or WebP image.",
  );
  expect(await db.select().from(filaments)).toHaveLength(0);
});

test("rejects unauthenticated, non-admin, and cross-origin requests", async () => {
  actor = null;
  expect((await upload(form("No auth"))).status).toBe(401);
  actor = { role: "user", mustChangePassword: false };
  expect((await upload(form("No admin"))).status).toBe(403);
  actor = { role: "admin", mustChangePassword: false };
  expect(
    (await upload(form("Wrong origin"), "https://evil.example")).status,
  ).toBe(403);
  expect(await db.select().from(filaments)).toHaveLength(0);
});

test("rejects a multipart body over 6 MB before parsing", async () => {
  const response = await upload(
    form(
      "Too much data",
      new File([Buffer.alloc(6_000_000)], "large.png", { type: "image/png" }),
    ),
  );
  expect(response.status).toBe(413);
  expect(await db.select().from(filaments)).toHaveLength(0);
  expect(
    await readdir(path.join(directory, "uploads")).catch(() => []),
  ).toEqual([]);
});
