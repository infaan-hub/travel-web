import type { Locale } from "./config";

export type Lookup = Map<string, string>;

const ZERO_WIDTH = /[\u200b-\u200d\ufeff]/g;

export function normalizeWhitespace(value: string): string {
  return value
    .replace(ZERO_WIDTH, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\r\n\f\v]+/g, " ")
    .trim();
}

export function buildLookup(dictionary: Record<string, string>): Lookup {
  const lookup: Lookup = new Map();
  for (const [key, value] of Object.entries(dictionary)) {
    const normalized = normalizeWhitespace(key);
    if (normalized && typeof value === "string" && value.trim()) {
      lookup.set(normalized, value);
    }
  }
  return lookup;
}

function word(lookup: Lookup, key: string, fallback: string): string {
  return lookup.get(key) ?? fallback;
}

/**
 * A few pieces of UI are assembled at runtime from a number and a noun, or
 * from a short prefix and a value. Translate the static part while leaving the
 * value exactly as the application produced it.
 */
function translatePatterns(
  core: string,
  lookup: Lookup,
  locale: Locale,
  translate: (value: string) => string,
): string | null {
  const range = core.match(/^Showing\s+([\d,.]+)\s*[–-]\s*([\d,.]+)\s+of\s+([\d,.]+)$/i);
  if (range) {
    return `${word(lookup, "Showing", "Showing")} ${range[1]}–${range[2]} ${word(lookup, "of", "of")} ${range[3]}`;
  }

  const page = core.match(/^Page\s+(\d+)\s+of\s+(\d+)$/i);
  if (page) {
    return `${word(lookup, "Page", "Page")} ${page[1]} ${word(lookup, "of", "of")} ${page[2]}`;
  }

  const section = core.match(/^(Section)\s+(\d+)\s+of\s+(\d+)$/i);
  if (section) {
    return `${word(lookup, "Section", "Section")} ${section[2]} ${word(lookup, "of", "of")} ${section[3]}`;
  }

  const intro = core.match(/^(Introduction)\s+(\d+)\s+of\s+(\d+)$/i);
  if (intro) {
    return `${word(lookup, "Introduction", "Introduction")} ${intro[2]} ${word(lookup, "of", "of")} ${intro[3]}`;
  }

  const image = core.match(/^Image\s+(\d+)$/i);
  if (image) {
    return `${word(lookup, "Image", "Image")} ${image[1]}`;
  }

  const day = core.match(/^Day\s+(\d+)\s*:\s*(.+)$/i);
  if (day) {
    return `${word(lookup, "Day", "Day")} ${day[1]}: ${translate(day[2])}`;
  }

  const completed = core.match(/^(\d+)%\s+completed$/i);
  if (completed) {
    return `${completed[1]}% ${word(lookup, "completed", "completed")}`;
  }

  const reviews = core.match(/^([\d,.]+)\s+(reviews?)$/i);
  if (reviews) {
    return `${reviews[1]} ${word(lookup, reviews[2].toLowerCase(), reviews[2])}`;
  }

  const countNoun = core.match(/^([\d,.]+)\s+(.{2,40})$/);
  if (countNoun) {
    const noun = normalizeWhitespace(countNoun[2]);
    const translatedNoun = lookup.get(noun) ?? lookup.get(noun.replace(/s$/, ""));
    if (translatedNoun) return `${countNoun[1]} ${translatedNoun}`;
  }

  // "Label: value" — localise the label only. Values are often names, dates or
  // other user-supplied content and must be left alone.
  const pair = core.match(/^([^:]{2,40}):\s(.+)$/);
  if (pair) {
    const label = lookup.get(normalizeWhitespace(pair[1]));
    if (label) return `${label}: ${pair[2]}`;
  }

  // "Thing · Thing" metadata rows, "Origin → Destination" route labels and
  // "Page | Travel." browser titles. Translate each segment only when it is a
  // known UI phrase so place names and user content stay untouched.
  for (const separator of [" · ", " | ", " → "]) {
    if (!core.includes(separator)) continue;
    const parts = core.split(separator);
    let changed = false;
    const translatedParts = parts.map((part) => {
      const translated = translate(part);
      if (translated !== part) changed = true;
      return translated;
    });
    if (changed) return translatedParts.join(separator);
  }

  // German and Swahili put the quantity after the noun less often than English
  // does; the simple patterns above cover the common cases. Leave anything
  // else untouched rather than producing a broken mixed-language sentence.
  void locale;
  return null;
}

/**
 * Translate a single visible string. Leading and trailing whitespace is kept so
 * JSX spacing around inline elements does not change.
 */
export function translateText(
  value: string,
  lookup: Lookup,
  locale: Locale,
): string {
  if (!value || !value.trim() || lookup.size === 0) return value;

  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const core = value.slice(leading.length, value.length - trailing.length);

  const normalized = normalizeWhitespace(core);
  if (!normalized) return value;

  // The site brand is a proper noun and stays the same in every language.
  if (normalized === "Travel.") return value;

  const exact = lookup.get(normalized);
  if (exact) return `${leading}${exact}${trailing}`;

  const pattern = translatePatterns(normalized, lookup, locale, (part) =>
    translateText(part, lookup, locale),
  );
  if (pattern) return `${leading}${pattern}${trailing}`;

  return value;
}
