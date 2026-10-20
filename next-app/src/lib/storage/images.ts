import "server-only";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileTypeFromBuffer } from "file-type";
import { ApiError } from "@/lib/api/http";
import { env } from "@/lib/env";

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
  | "tips";

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
 * Validates the bytes (not the browser-provided MIME type), stores the object
 * and returns its storage key. Keys are relative and provider independent.
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
  const config = env();

  if (config.STORAGE_PROVIDER === "supabase") {
    if (!config.STORAGE_URL || !config.STORAGE_SERVICE_KEY) {
      throw new ApiError(503, "Object storage is not configured.");
    }
    const objectUrl = `${config.STORAGE_URL.replace(/\/$/, "")}/storage/v1/object/${config.STORAGE_BUCKET}/${key}`;
    const response = await fetch(objectUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.STORAGE_SERVICE_KEY}`,
        "Content-Type": detected!.mime,
        "x-upsert": "true",
        "cache-control": "public, max-age=31536000, immutable",
      },
      body: buffer,
    });
    if (!response.ok) {
      console.error("Supabase storage upload failed", response.status, await response.text());
      throw new ApiError(502, "Image storage is temporarily unavailable.");
    }
    return key;
  }

  const target = path.join(uploadsRoot(), key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  return key;
}

export async function deleteImage(key: string | null | undefined): Promise<void> {
  if (!key) return;
  const config = env();
  const safe = key.replace(/^\/?(uploads|media)\//, "");
  if (!/^[a-z0-9/_.-]+$/i.test(safe) || safe.includes("..")) return;

  if (config.STORAGE_PROVIDER === "supabase") {
    if (!config.STORAGE_URL || !config.STORAGE_SERVICE_KEY) return;
    const objectUrl = `${config.STORAGE_URL.replace(/\/$/, "")}/storage/v1/object/${config.STORAGE_BUCKET}/${safe}`;
    try {
      await fetch(objectUrl, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${config.STORAGE_SERVICE_KEY}` },
      });
    } catch (error) {
      console.error("Failed to delete storage object", safe, error);
    }
    return;
  }

  try {
    await unlink(path.join(uploadsRoot(), safe));
  } catch {
    // Already removed or never existed locally.
  }
}

/** Resolves a stored key into a browser-usable URL. */
export function publicImageUrl(key: string | null | undefined): string | null {
  if (!key) return null;
  if (key.startsWith("http://") || key.startsWith("https://")) return key;
  const config = env();
  const safe = key.replace(/^\/?(uploads|media)\//, "");
  if (config.STORAGE_PROVIDER === "supabase" && config.STORAGE_URL) {
    return `${config.STORAGE_URL.replace(/\/$/, "")}/storage/v1/object/public/${config.STORAGE_BUCKET}/${safe}`;
  }
  const base = process.env.NEXT_PUBLIC_MEDIA_BASE_URL;
  if (base) return `${base.replace(/\/$/, "")}/uploads/${safe}`;
  return `/uploads/${safe}`;
}
