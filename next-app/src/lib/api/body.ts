import { ApiError } from "@/lib/api/http";
import { saveImage, type UploadFolder } from "@/lib/storage/images";

export type Payload = Record<string, unknown>;

/**
 * Reads a JSON or multipart/form-data request body into a plain object while
 * keeping File values available for the storage layer.
 */
export async function readPayload(request: Request): Promise<Payload> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    const payload: Payload = {};
    form.forEach((value, key) => {
      payload[key] = value;
    });
    return payload;
  }
  if (contentType.includes("application/x-www-form-urlencoded")) {
    const form = await request.formData();
    const payload: Payload = {};
    form.forEach((value, key) => {
      payload[key] = value;
    });
    return payload;
  }
  try {
    const body = (await request.json()) as unknown;
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      throw new ApiError(400, "Request body must be a JSON object.");
    }
    return body as Payload;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "Invalid request body.");
  }
}

export function fileFrom(payload: Payload, key: string): File | null {
  const value = payload[key];
  if (value && typeof value === "object" && "arrayBuffer" in value && "size" in value) {
    const file = value as File;
    if (file.size > 0 && file.name) return file;
  }
  return null;
}

export async function storeUpload(
  payload: Payload,
  key: string,
  folder: UploadFolder,
): Promise<string | null> {
  const file = fileFrom(payload, key);
  if (!file) return null;
  return saveImage(file, folder);
}

export function stripFiles(payload: Payload): Payload {
  const clean: Payload = {};
  for (const [key, value] of Object.entries(payload)) {
    if (value && typeof value === "object" && "arrayBuffer" in value) continue;
    clean[key] = value;
  }
  return clean;
}
