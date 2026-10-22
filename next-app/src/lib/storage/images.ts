import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { ApiError } from "@/lib/api/http";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

const ALLOWED = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export type UploadFolder =
  | "tours"
  | "tours/gallery"
  | "attractions"
  | "home"
  | "hotels"
  | "profiles"
  | "drivers"
  | "tips"
  | "companies"
  | "companies/covers";

function assertAllowedFolder(folder: string): string {
  if (!/^[a-z0-9/_-]+$/i.test(folder) || folder.includes("..")) {
    throw new ApiError(400, "Invalid upload folder.");
  }
  return folder.replace(/^\/+|\/+$/g, "");
}

function uploadsRoot(): string {
  return path.join(process.cwd(), "public", "uploads");
}

/**
 * Validates the bytes (not the browser-provided MIME type), stores the file
 * and returns its storage key. Keys are relative to the uploads root.
 */
export async function saveImage(file: File, folder: UploadFolder): Promise<string> {
  const safeFolder = assertAllowedFolder(folder);
  if (!file || typeof file.arrayBuffer !== "function") {
    throw new ApiError(400, "No image file provided.");
  }
  if (file.size <= 0) {
    throw new ApiError(400, "The uploaded file is empty.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new ApiError(400, "Image too large. Maximum size is 5MB.");
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const detected = await fileTypeFromBuffer(buffer);
  const extension = detected ? ALLOWED.get(detected.mime) : undefined;
  if (!extension) {
    throw new ApiError(400, "Invalid image type. Allowed formats: JPG, PNG, WEBP.");
  }

  const key = `${safeFolder}/${randomUUID()}.${extension}`;
  const target = path.join(uploadsRoot(), key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  return key;
}

export async function deleteImage(key: string | null | undefined): Promise<void> {
  if (!key) return;
  const safe = key.replace(/^\/?(uploads|media)\//, "");
  if (!/^[a-z0-9/_.-]+$/i.test(safe) || safe.includes("..")) return;

  try {
    await unlink(path.join(uploadsRoot(), safe));
  } catch {
    // Already removed or never existed.
  }
}

/** Resolves a stored key into a browser-usable URL. */
export function publicImageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("http://") || key.startsWith("https://")) return key;
  const safe = key.replace(/^\/?(uploads|media)\//, "");
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  if (base) return `${base.replace(/\/$/, "")}/uploads/${safe}`;
  return `/uploads/${safe}`;
}
