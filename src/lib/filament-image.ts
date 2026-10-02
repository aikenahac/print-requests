import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

export async function saveFilamentImage(
  file: File,
  directory = path.resolve(process.env.UPLOAD_DIR ?? "./data/uploads"),
) {
  if (file.size === 0) return null;
  if (file.size > 5_000_000) throw new Error("Image must be 5 MB or smaller.");
  const bytes = Buffer.from(await file.arrayBuffer());
  const png = bytes
    .subarray(0, 8)
    .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const jpeg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const webp =
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP";
  const ext = png ? "png" : jpeg ? "jpg" : webp ? "webp" : null;
  if (!ext) throw new Error("Upload a PNG, JPEG, or WebP image.");
  await mkdir(directory, { recursive: true });
  const name = `${randomUUID()}.${ext}`;
  await writeFile(path.join(directory, name), bytes, { flag: "wx" });
  return name;
}
