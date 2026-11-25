import type { Locale } from "./config";

export type Lookup = Map<string, string>;

const ZERO_WIDTH = /[\u200b-\u200d\ufeff]/g;
const CI_CACHE = new WeakMap<Lookup, Map<string, string>>();

export function normalizeWhitespace(value: string): string {
  return value
    .replace(ZERO_WIDTH, "")
    .replace(/\u00a0/g, " ")
    .replace(/[ \t\r\n\f\v]+/g, " ")
    .trim();
}

function foldKey(value: string): string {
  return normalizeWhitespace(value)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/\u2026/g, "...")
    .toLowerCase();
}

function getCiLookup(lookup: Lookup): Map<string, string> {
  let ci = CI_CACHE.get(lookup);
  if (ci) return ci;
  ci = new Map();
  for (const [key, value] of lookup.entries()) {
    const folded = foldKey(key);
    if (folded && !ci.has(folded)) {
      ci.set(folded, value);
    }
  }
  CI_CACHE.set(lookup, ci);
  return ci;
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

function matchCase(source: string, translated: string, locale: Locale): string {
  if (!source || !translated) return translated;
  const letters = source.replace(/[^A-Za-z]/g, "");
  if (letters.length >= 2 && letters === letters.toUpperCase()) {
    return translated.toUpperCase();
  }
  const firstSrc = source[0];
  const firstTr = translated[0];
  if (firstSrc >= "A" && firstSrc <= "Z" && firstTr >= "a" && firstTr <= "z") {
    return firstTr.toUpperCase() + translated.slice(1);
  }
  if (
    locale !== "de" &&
    firstSrc >= "a" &&
    firstSrc <= "z" &&
    firstTr >= "A" &&
    firstTr <= "Z"
  ) {
    return firstTr.toLowerCase() + translated.slice(1);
  }
  return translated;
}

function directLookup(
  lookup: Lookup,
  key: string,
  locale: Locale,
): string | null {
  const exact = lookup.get(key);
  if (exact) return exact;
  const ci = getCiLookup(lookup).get(foldKey(key));
  if (ci) return matchCase(key, ci, locale);
  return null;
}

function word(
  lookup: Lookup,
  key: string,
  fallback: string,
  locale: Locale,
): string {
  return directLookup(lookup, key, locale) ?? fallback;
}

function lookupNoun(lookup: Lookup, noun: string, locale: Locale): string | null {
  const clean = normalizeWhitespace(noun);
  const direct = directLookup(lookup, clean, locale);
  if (direct) return direct;
  if (clean.endsWith("ies") && clean.length > 4) {
    const singularY = directLookup(lookup, `${clean.slice(0, -3)}y`, locale);
    if (singularY) return singularY;
  }
  if (clean.endsWith("s") && clean.length > 2) {
    const singular = directLookup(lookup, clean.slice(0, -1), locale);
    if (singular) return singular;
  }
  return null;
}

/**
 * Translates common runtime-composed UI strings (counters, step indicators,
 * tab counts, price prefixes, metadata pairs, and segmented labels) while
 * leaving proper nouns, numbers, and user-entered values intact.
 */
function translatePatterns(
  core: string,
  lookup: Lookup,
  locale: Locale,
  translate: (value: string) => string,
  depth: number,
): string | null {
  if (depth > 4) return null;

  // 1. Range / pagination / step counters
  const range = core.match(/^Showing\s+([\d,.]+)\s*[–-]\s*([\d,.]+)\s+of\s+([\d,.]+)(?:\s+(.+))?$/i);
  if (range) {
    const tail = range[4] ? ` ${translate(range[4])}` : "";
    return `${word(lookup, "Showing", "Showing", locale)} ${range[1]}–${range[2]} ${word(lookup, "of", "of", locale)} ${range[3]}${tail}`;
  }

  const showingOf = core.match(/^Showing\s+([\d,.]+)\s+of\s+([\d,.]+)(?:\s+(.+))?$/i);
  if (showingOf) {
    const tail = showingOf[3] ? ` ${translate(showingOf[3])}` : "";
    return `${word(lookup, "Showing", "Showing", locale)} ${showingOf[1]} ${word(lookup, "of", "of", locale)} ${showingOf[2]}${tail}`;
  }

  const stepOf = core.match(/^(Step|Page|Section|Introduction)\s+(\d+)\s+of\s+(\d+)$/i);
  if (stepOf) {
    const prefix = word(lookup, stepOf[1], stepOf[1], locale);
    return `${prefix} ${stepOf[2]} ${word(lookup, "of", "of", locale)} ${stepOf[3]}`;
  }

  const xOfY = core.match(/^(\d+)\s+of\s+(\d+)(?:\s+(.+))?$/i);
  if (xOfY) {
    const tail = xOfY[3] ? ` ${translate(xOfY[3])}` : "";
    return `${xOfY[1]} ${word(lookup, "of", "of", locale)} ${xOfY[2]}${tail}`;
  }

  const ratioLabel = core.match(/^(\d+)\s*\/\s*(\d+)\s+(.{2,60})$/);
  if (ratioLabel) {
    const rest = translate(ratioLabel[3]);
    if (rest !== ratioLabel[3]) {
      return `${ratioLabel[1]} / ${ratioLabel[2]} ${rest}`;
    }
  }

  const image = core.match(/^Image\s+(\d+)$/i);
  if (image) {
    return `${word(lookup, "Image", "Image", locale)} ${image[1]}`;
  }

  const day = core.match(/^Day\s+(\d+)\s*:\s*(.+)$/i);
  if (day) {
    return `${word(lookup, "Day", "Day", locale)} ${day[1]}: ${translate(day[2])}`;
  }

  const pct = core.match(/^(\d+(?:\.\d+)?)%\s+([A-Za-z][A-Za-z\s-]{1,30})$/);
  if (pct) {
    const label = directLookup(lookup, pct[2], locale);
    if (label) return `${pct[1]}% ${label}`;
  }

  // 2. Price / quantity prefixes ("From $45", "Up to 50 passengers", "View 5 Photos")
  const fromPrice = core.match(/^From\s+((?:US\$|\$|TSh|TZS|€|£)\s?[\d,.]+.*)$/i);
  if (fromPrice) {
    return `${word(lookup, "From", "From", locale)} ${fromPrice[1]}`;
  }

  const upTo = core.match(/^Up\s+to\s+([\d,.]+\+?)\s+(.{2,50})$/i);
  if (upTo) {
    const rest = translate(upTo[2]);
    if (rest !== upTo[2]) {
      return `${word(lookup, "Up to", "Up to", locale)} ${upTo[1]} ${rest}`;
    }
  }

  const viewCount = core.match(/^View\s+([\d,.]+)\s+(.{2,40})$/i);
  if (viewCount) {
    const noun = lookupNoun(lookup, viewCount[2], locale);
    if (noun) {
      return `${word(lookup, "View", "View", locale)} ${viewCount[1]} ${noun}`;
    }
  }

  // 3. Parenthetical wrappers & count badges ("(Optional)", "All (9)", "Assigned services (2)")
  const wrapped = core.match(/^\(([^()]{2,80})\)$/);
  if (wrapped) {
    const inner = translate(wrapped[1]);
    if (inner !== wrapped[1]) return `(${inner})`;
  }

  const countSuffix = core.match(/^(.{2,70}?)\s*\(([\d,./+\s]+)\)$/);
  if (countSuffix) {
    const left = translate(countSuffix[1]);
    if (left !== countSuffix[1]) return `${left} (${countSuffix[2]})`;
  }

  // 4. Decorative leading prefixes ("+ Add Vehicle", "← Back", "✓ Verified")
  const leadingDecor = core.match(/^([+✓✔✕×•★☆←→↗↓↑]\s+)(.{2,})$/);
  if (leadingDecor) {
    const inner = translate(leadingDecor[2]);
    if (inner !== leadingDecor[2]) return `${leadingDecor[1]}${inner}`;
  }

  // 5. Trailing arrows, colons, asterisks, or ellipses ("Route prices →", "Email *", "Saving...")
  const trailingDecor = core.match(/^(.{2,}?)(\s*[→↗←*]|\s*:|\.{3}|…)$/);
  if (trailingDecor) {
    const inner = translate(trailingDecor[1]);
    if (inner !== trailingDecor[1]) return `${inner}${trailingDecor[2]}`;
  }

  // 6. "<count> <noun>" ("7 Seats", "5 Bags", "2 vehicles", "12 reviews", "5 pax")
  const countNoun = core.match(/^([\d,.]+\+?)\s+(.{2,44})$/);
  if (countNoun) {
    const noun = lookupNoun(lookup, countNoun[2], locale);
    if (noun) return `${countNoun[1]} ${noun}`;
  }

  // 7. Major metadata separators first so "Assigned by X · Updated Y" translates both segments
  for (const separator of [" · ", " | ", " • "]) {
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

  // 8. Known dynamic prefixes ("Assigned by Acme", "Updated Nov 24, 2026", "View only — managed by Acme.")
  const dynamicPrefix = core.match(
    /^(View-only access — managed by|View only — managed by|Assigned by|Managed by|Updated|Issued|Created)\s+(.+?)(\.?)$/i,
  );
  if (dynamicPrefix) {
    const translatedPrefix = directLookup(lookup, dynamicPrefix[1], locale);
    if (translatedPrefix) {
      const tailVal = translate(dynamicPrefix[2]);
      return `${translatedPrefix} ${tailVal}${dynamicPrefix[3]}`;
    }
  }

  // 9. "Label: value" — translate the label, and also translate the value if it is a known UI word/status.
  const pair = core.match(/^([^:]{2,44}):\s+(.+)$/);
  if (pair) {
    const label = directLookup(lookup, normalizeWhitespace(pair[1]), locale);
    const valTranslated = translate(normalizeWhitespace(pair[2]));
    if (label || valTranslated !== normalizeWhitespace(pair[2])) {
      return `${label ?? pair[1]}: ${valTranslated}`;
    }
  }

  // 10. Secondary separators (arrows, dashes, slashes)
  for (const separator of [" → ", " — ", " – ", " / "]) {
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

  // 10. Multi-sentence fallback for paragraphs assembled from separate known sentences
  if (depth === 0 && /[.!?]\s+/.test(core)) {
    const pieces = core.split(/(?<=[.!?])\s+/);
    if (pieces.length > 1 && pieces.length <= 6) {
      let changed = false;
      const mapped = pieces.map((piece) => {
        const tr = translate(piece);
        if (tr !== piece) changed = true;
        return tr;
      });
      if (changed) return mapped.join(" ");
    }
  }

  return null;
}

function translateInner(
  value: string,
  lookup: Lookup,
  locale: Locale,
  depth: number,
): string {
  if (!value || !value.trim() || lookup.size === 0) return value;

  const leading = value.match(/^\s*/)?.[0] ?? "";
  const trailing = value.match(/\s*$/)?.[0] ?? "";
  const core = value.slice(leading.length, value.length - trailing.length);

  const normalized = normalizeWhitespace(core);
  if (!normalized) return value;

  // Keep the brand name untouched in every language.
  if (normalized === "Travel.") return value;

  const direct = directLookup(lookup, normalized, locale);
  if (direct) return `${leading}${direct}${trailing}`;

  const pattern = translatePatterns(
    normalized,
    lookup,
    locale,
    (part) => translateInner(part, lookup, locale, depth + 1),
    depth,
  );
  if (pattern) return `${leading}${pattern}${trailing}`;

  return value;
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
  return translateInner(value, lookup, locale, 0);
}
