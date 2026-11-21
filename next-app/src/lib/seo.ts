export const SITE_NAME = "Travel.";

export const DEFAULT_TITLE = "Travel. | Zanzibar Private Hire, Drivers & Island Trips";

export const DEFAULT_OG_TITLE =
  "Travel. — Zanzibar Private Hire, Verified Drivers & Island Trips";

export const DEFAULT_OG_DESCRIPTION =
  "Book verified private hire vehicles, licensed local drivers, and curated trips across Zanzibar. Measure routes in seconds, compare trusted local companies, and travel with confidence.";

export const DEFAULT_OG_IMAGE = {
  url: "/og-image.jpg",
  width: 1200,
  height: 630,
  alt: "Travel. — Private Hire & Trips Across Zanzibar",
  type: "image/jpeg",
} as const;

export function resolveMetadataBase(
  envSource: Record<string, string | undefined> = process.env,
): URL {
  const candidates = [
    envSource.APP_URL,
    envSource.NEXT_PUBLIC_APP_URL,
    envSource.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${envSource.VERCEL_PROJECT_PRODUCTION_URL.replace(/^https?:\/\//i, "")}`
      : undefined,
    envSource.VERCEL_URL
      ? `https://${envSource.VERCEL_URL.replace(/^https?:\/\//i, "")}`
      : undefined,
  ];

  for (const candidate of candidates) {
    const trimmed = candidate?.trim();
    if (!trimmed) continue;
    try {
      return new URL(trimmed);
    } catch {
      // Try next environment variable candidate.
    }
  }

  return new URL("http://localhost:3000");
}
