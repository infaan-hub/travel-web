const PLACEHOLDER =
  "data:image/svg+xml," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300">' +
      '<rect fill="#1a1a2e" width="400" height="300"/>' +
      "</svg>",
  );

/**
 * Resolves stored media paths and storage keys into web URLs.
 * New API responses are already relative (`/uploads/...`) or absolute
 * (Supabase public URLs), so this remains only as a compatibility helper.
 */
export function getImageUrl(url: string | null | undefined): string {
  if (!url) return PLACEHOLDER;
  if (url.startsWith("data:")) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) {
    // Normalize stored media paths into application URLs.
    const match = url.match(/^https?:\/\/[^/]+(\/media\/.*)$/);
    if (match) return match[1].replace(/^\/media\//, "/uploads/");
    return url;
  }
  if (url.startsWith("/uploads/")) return url;
  if (url.startsWith("/media/")) return url.replace(/^\/media\//, "/uploads/");
  if (url.startsWith("/")) return url;
  return `/uploads/${url.replace(/^\/+/, "")}`;
}

export { PLACEHOLDER };
