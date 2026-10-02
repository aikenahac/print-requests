import { afterEach, expect, test } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createClient, type Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import { count, eq } from "drizzle-orm";
import { filaments, requests, users } from "../src/db/schema";
import {
  hashPassword,
  newPasswordError,
  verifyPassword,
} from "../src/lib/password";
import { saveFilamentImage } from "../src/lib/filament-image";
import {
  cancelQueuedRequest,
  editQueuedRequest,
  enqueueRequest,
  moveQueuedRequest,
  transitionQueuedRequest,
} from "../src/lib/queue";
import { claimFirstAdmin } from "../src/lib/setup";
import {
  parseMakerworldUrl,
  parseRequestForm,
  type RequestInput,
} from "../src/lib/validation";

const cleanups: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0)) await cleanup();
});

async function freshDatabase() {
  const directory = await mkdtemp(path.join(tmpdir(), "print-queue-test-"));
  const client: Client = createClient({
    url: `file:${path.join(directory, "test.db")}`,
  });
  cleanups.push(async () => {
    client.close();
    await rm(directory, { recursive: true, force: true });
  });
  const migration = await readFile(
    path.join(
      process.cwd(),
      "drizzle/20261001134207_stale_marten_broadcloak/migration.sql",
    ),
    "utf8",
  );
  await client.executeMultiple(migration);
  return drizzle({ client });
}

test("new passwords require confirmation and are hashed", async () => {
  expect(newPasswordError("long-enough-password", "different-password")).toBe(
    "The new passwords do not match.",
  );
  expect(newPasswordError("too-short", "too-short")).toBeTruthy();
  expect(
    newPasswordError("long-enough-password", "long-enough-password"),
  ).toBeNull();
  const stored = await hashPassword("long-enough-password");
  expect(stored).not.toContain("long-enough-password");
  expect(await verifyPassword("long-enough-password", stored)).toBe(true);
  expect(await verifyPassword("wrong-password", stored)).toBe(false);
});

test("MakerWorld links, urgent reasons, and AMS confirmation are validated", () => {
  expect(
    parseMakerworldUrl(
      "https://makerworld.com/en/models/123456-thing#profileId-1",
    ),
  ).toBe("https://makerworld.com/en/models/123456-thing#profileId-1");
  expect(
    parseMakerworldUrl("https://makerworld.com/it/models/123456?from=search"),
  ).toBe("https://makerworld.com/it/models/123456?from=search");
  expect(
    parseMakerworldUrl("https://makerworld.com.evil.test/en/models/123456"),
  ).toBeNull();
  const form = new FormData();
  form.set("title", "Desk hook");
  form.set("makerworldUrl", "https://makerworld.com/en/models/123456-thing");
  form.set("quantity", "2");
  form.append("filamentIds", "a");
  form.append("filamentIds", "b");
  expect(parseRequestForm(form)).toBe(
    "Confirm that the MakerWorld print profile supports AMS.",
  );
  form.set("amsConfirmed", "on");
  form.set("urgent", "on");
  expect(parseRequestForm(form)).toBe(
    "Explain why the request is urgent (3–500 characters).",
  );
  form.set("urgentReason", "Needed for Saturday");
  expect(typeof parseRequestForm(form)).toBe("object");
});

test("only one concurrent first-admin claim succeeds", async () => {
  const database = await freshDatabase();
  const hash = await hashPassword("a-safe-test-password");
  const results = await Promise.all(
    Array.from({ length: 5 }, (_, index) =>
      claimFirstAdmin(database, `admin${index}`, hash),
    ),
  );
  expect(results.filter(Boolean)).toHaveLength(1);
  const [total] = await database.select({ value: count() }).from(users);
  expect(total.value).toBe(1);
  const [admin] = await database
    .select()
    .from(users)
    .where(eq(users.role, "admin"));
  expect(admin).toBeDefined();
});

test("filament photos save on disk and invalid files are rejected", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "print-queue-images-"));
  cleanups.push(async () => {
    await rm(directory, { recursive: true, force: true });
  });
  const bytes = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Z5S8AAAAASUVORK5CYII=",
    "base64",
  );
  const name = await saveFilamentImage(
    new File([bytes], "sample.png", { type: "image/png" }),
    directory,
  );
  expect(name).toMatch(/\.png$/);
  expect(await readFile(path.join(directory, name!))).toEqual(bytes);
  await expect(
    saveFilamentImage(
      new File(["not an image"], "bad.png", { type: "image/png" }),
      directory,
    ),
  ).rejects.toThrow("Upload a PNG, JPEG, or WebP image.");
});

test("queue order, ownership, and status transitions stay consistent", async () => {
  const database = await freshDatabase();
  const now = new Date();
  await database.insert(users).values([
    {
      id: "owner",
      username: "owner",
      passwordHash: "hash",
      role: "user",
      createdAt: now,
    },
    {
      id: "other",
      username: "other",
      passwordHash: "hash",
      role: "user",
      createdAt: now,
    },
  ]);
  await database
    .insert(filaments)
    .values({ id: "red", name: "Red PLA", createdAt: now });
  const input: RequestInput = {
    title: "Desk hook",
    makerworldUrl: "https://makerworld.com/en/models/123-hook",
    quantity: 1,
    notes: null,
    urgent: false,
    urgentReason: null,
    amsConfirmed: false,
    filamentIds: ["red"],
  };
  const first = await enqueueRequest(database, "owner", input);
  const second = await enqueueRequest(database, "owner", input);
  const third = await enqueueRequest(database, "other", input);
  expect(await moveQueuedRequest(database, third, "up")).toBe(true);
  expect(
    await editQueuedRequest(database, first, "other", {
      ...input,
      title: "Not yours",
    }),
  ).toBe(false);
  expect(
    await editQueuedRequest(database, first, "owner", {
      ...input,
      title: "Updated hook",
    }),
  ).toBe(true);
  expect(await cancelQueuedRequest(database, second, "other")).toBe(false);
  expect(await cancelQueuedRequest(database, second, "owner")).toBe(true);
  let waiting = await database
    .select({ id: requests.id, position: requests.queuePosition })
    .from(requests)
    .where(eq(requests.status, "queued"));
  expect(
    waiting.sort((a, b) => Number(a.position) - Number(b.position)),
  ).toEqual([
    { id: first, position: 1 },
    { id: third, position: 2 },
  ]);
  expect(await transitionQueuedRequest(database, first, "printing")).toBe(true);
  expect(await transitionQueuedRequest(database, third, "printing")).toBe(
    false,
  );
  expect(await editQueuedRequest(database, first, "owner", input)).toBe(false);
  expect(await transitionQueuedRequest(database, first, "ready")).toBe(true);
  expect(await transitionQueuedRequest(database, first, "completed")).toBe(
    true,
  );
  waiting = await database
    .select({ id: requests.id, position: requests.queuePosition })
    .from(requests)
    .where(eq(requests.status, "queued"));
  expect(waiting).toEqual([{ id: third, position: 1 }]);
});
