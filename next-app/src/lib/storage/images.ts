import "server-only";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { del, put } from "@vercel/blob";
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

function hasBlobCredentials(): boolean {
  return Boolean(
    process.env.BLOB_READ_WRITE_TOKEN ||
      (process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN),
  );
}

/**
 * Validates the bytes (not the browser-provided MIME type), stores the file
 * and returns its storage key or public URL.
 */
export async function saveImage(file: File, folder: UploadFolder): Promise<string> {
  const { buffer, extension, mimeType } = await validatedImage(file);
  const safeFolder = assertAllowedFolder(folder);
  const filename = `${randomUUID()}.${extension}`;

  if (hasBlobCredentials()) {
    const blob = await put(`${safeFolder}/${filename}`, buffer, {
      access: "public",
      addRandomSuffix: false,
      contentType: mimeType,
    });
    return blob.url;
  }

  if (process.env.VERCEL === "1") {
    throw new ApiError(
      503,
      "Image storage is not configured. Connect a Vercel Blob store and retry.",
    );
  }

  const key = `${safeFolder}/${filename}`;
  const target = path.join(uploadsRoot(), key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, buffer);
  return key;
}

export async function validatedImage(file: File): Promise<{
  buffer: Buffer;
  mimeType: string;
  extension: string;
}> {
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

  return { buffer, mimeType: detected!.mime, extension };
}

export async function readStoredImage(key: string): Promise<{ buffer: Buffer; mimeType: string } | null> {
  const safe = key.replace(/^\/?(uploads|media)\//, "");
  if (!/^[a-z0-9/_.-]+$/i.test(safe) || safe.includes("..")) return null;
  try {
    const buffer = await readFile(path.join(uploadsRoot(), safe));
    const detected = await fileTypeFromBuffer(buffer);
    if (!detected || !ALLOWED.has(detected.mime)) return null;
    return { buffer, mimeType: detected.mime };
  } catch {
    return null;
  }
}

export async function deleteImage(key: string | null | undefined): Promise<void> {
  if (!key) return;

  if (/^https:\/\/[^/]+\.blob\.vercel-storage\.com\//i.test(key)) {
    try {
      await del(key);
    } catch (error) {
      console.error("Failed to delete image from Vercel Blob", error);
    }
    return;
  }

  if (/^https?:\/\//i.test(key)) return;

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
