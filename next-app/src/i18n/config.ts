export const LOCALES = ["en", "sw", "fr", "es", "de"] as const;

export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

/** Names shown in the language picker, written in their own language. */
export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  sw: "Kiswahili",
  fr: "Français",
  es: "Español",
  de: "Deutsch",
};

/** Compact labels used by the small header control. */
export const LOCALE_SHORT_LABELS: Record<Locale, string> = {
  en: "EN",
  sw: "SW",
  fr: "FR",
  es: "ES",
  de: "DE",
};

/** BCP 47 tags for Intl formatting. */
export const LOCALE_INTL_TAGS: Record<Locale, string> = {
  en: "en-GB",
  sw: "sw-TZ",
  fr: "fr-FR",
  es: "es-ES",
  de: "de-DE",
};

export const LANGUAGE_STORAGE_KEY = "travel.language";
export const LANGUAGE_COOKIE_NAME = "travel_language";
export const LANGUAGE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Accepts `fr-FR`, `sw_KE`, `de` and similar values and maps them to one of
 * the supported base locales. Unknown values fall back to English.
 */
export function normalizeLocale(value: string | null | undefined): Locale {
  if (!value) return DEFAULT_LOCALE;
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  return isLocale(base) ? base : DEFAULT_LOCALE;
}
