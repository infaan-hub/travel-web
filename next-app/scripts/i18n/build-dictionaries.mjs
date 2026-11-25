/**
 * Build the runtime translation dictionaries from the extracted English UI
 * strings.
 *
 * Translations are produced once during development and committed to the
 * repository, so the application never calls a translation service at runtime.
 * A small overrides file keeps navigation and other high-traffic labels
 * consistent and natural.
 *
 * Run with: npm run i18n:build
 * Optional: node scripts/i18n/build-dictionaries.mjs --limit=20
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const LOCALES = ["sw", "fr", "es", "de"];
const ENDPOINT = "https://translate.googleapis.com/translate_a/t";
const BRAND = "Travel.";
const BRAND_TOKEN = "{{I18N}}";
// Bump when brand handling changes so previously cached brand strings refresh.
const CACHE_VERSION = 3;

// Translation engines do not know that "driver" here means a chauffeur, not a
// device driver or an aircraft pilot. Normalise those domain words after the
// machine translation pass.
const GLOSSARY = {
  sw: [
    [/\bKiendeshi\b/g, "Dereva"],
    [/\bkiendeshi\b/g, "dereva"],
    [/\bVidhibiti\b/g, "Madereva"],
    [/\bvidhibiti\b/g, "madereva"],
  ],
  fr: [
    [/\bPilote\b/g, "Chauffeur"],
    [/\bpilote\b/g, "chauffeur"],
    [/\bPilotes\b/g, "Chauffeurs"],
    [/\bpilotes\b/g, "chauffeurs"],
  ],
  es: [],
  de: [
    [/\bTreiber\b/g, "Fahrer"],
    [/\btreiber\b/g, "Fahrer"],
    [/\bTreibern\b/g, "Fahrern"],
    [/\btreibern\b/g, "Fahrern"],
    [/\bTreiber-/g, "Fahrer-"],
    [/\btreiber-/g, "fahrer-"],
  ],
};
const CACHE_DIR = path.join(__dirname, ".cache");
const OUTPUT_DIR = path.join(root, "src/i18n/dictionaries");
const SOURCE_FILE = path.join(__dirname, "source-strings.json");
const OVERRIDES_FILE = path.join(__dirname, "overrides.json");

const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const LIMIT = limitArg ? Number.parseInt(limitArg.split("=")[1], 10) : 0;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  const data = JSON.stringify(value, null, 2) + "\n";
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      fs.writeFileSync(file, data, "utf8");
      return;
    } catch (error) {
      if (attempt === 4) throw error;
      // Windows can briefly lock a file while an indexer or antivirus scans it.
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
    }
  }
}

async function translateBatch(sources, locale) {
  const params = new URLSearchParams({
    client: "dict-chrome-ex",
    sl: "en",
    tl: locale,
  });
  for (const source of sources) {
    // The site name is a proper noun. Sending a placeholder keeps the
    // translation engine from turning "Travel." into an ordinary verb/noun.
    params.append("q", source.split(BRAND).join(BRAND_TOKEN));
  }

  const response = await fetch(`${ENDPOINT}?${params.toString()}`, {
    headers: {
      "User-Agent": "Travel-i18n-builder/1.0",
      Accept: "application/json",
    },
    signal: AbortSignal.timeout(45_000),
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const payload = await response.json();
  if (!Array.isArray(payload)) {
    if (typeof payload === "string") return [payload];
    throw new Error(`Unexpected translation payload: ${JSON.stringify(payload).slice(0, 200)}`);
  }

  const results = payload.map((item) => {
    if (typeof item === "string") return item;
    if (Array.isArray(item)) {
      return item
        .map((part) => (Array.isArray(part) ? part[0] : part))
        .filter((part) => typeof part === "string")
        .join("");
    }
    return "";
  });

  if (results.length !== sources.length) {
    throw new Error(`Expected ${sources.length} translations, received ${results.length}`);
  }
  return results.map((result) =>
    result
      .replace(/\{\{I18N\}\}\./gi, BRAND)
      .replace(/\{\{I18N\}\}/gi, BRAND),
  );
}

function applyGlossary(text, locale) {
  let result = text;
  for (const [pattern, replacement] of GLOSSARY[locale] || []) {
    result = result.replace(pattern, replacement);
  }
  return result;
}

function buildBatches(items, maxLength = 6500) {
  const batches = [];
  let batch = [];
  let length = 0;
  for (const item of items) {
    const size = encodeURIComponent(item).length + 3;
    if (size > maxLength) {
      if (batch.length) batches.push(batch);
      batches.push([item]);
      batch = [];
      length = 0;
      continue;
    }
    if (batch.length >= 24 || length + size > maxLength) {
      batches.push(batch);
      batch = [];
      length = 0;
    }
    batch.push(item);
    length += size;
  }
  if (batch.length) batches.push(batch);
  return batches;
}

async function translateWithRetry(sources, locale) {
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      return await translateBatch(sources, locale);
    } catch (error) {
      lastError = error;
      const wait = 1200 * 2 ** attempt;
      console.warn(`  retry ${attempt + 1}/5 after ${wait}ms: ${error.message}`);
      await sleep(wait);
    }
  }
  throw lastError;
}

async function main() {
  if (!fs.existsSync(SOURCE_FILE)) {
    throw new Error("source-strings.json is missing. Run `npm run i18n:extract` first.");
  }

  const sourcePairs = readJson(SOURCE_FILE, []);
  const overrides = readJson(OVERRIDES_FILE, {});
  const uniqueSources = [...new Set(sourcePairs.map((pair) => pair.source))];
  const sources = LIMIT ? uniqueSources.slice(0, LIMIT) : uniqueSources;

  fs.mkdirSync(CACHE_DIR, { recursive: true });
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  for (const locale of LOCALES) {
    console.log(`\n[${locale}] ${sources.length} strings`);
    const cacheFile = path.join(CACHE_DIR, `${locale}.json`);
    const cache = readJson(cacheFile, {});
    const needsBrandRefresh = cache.__version !== CACHE_VERSION;
    const missing = sources.filter(
      (source) => !cache[source] || (needsBrandRefresh && source.includes(BRAND)),
    );

    if (missing.length) {
      const batches = buildBatches(missing);
      for (let index = 0; index < batches.length; index += 1) {
        const batch = batches[index];
        const translated = await translateWithRetry(batch, locale);
        batch.forEach((source, itemIndex) => {
          const value = (translated[itemIndex] || "").trim();
          if (value) cache[source] = value;
        });
        writeJson(cacheFile, cache);
        if (index % 10 === 0 || index === batches.length - 1) {
          console.log(`  ${Math.min((index + 1) * 24, missing.length)}/${missing.length} translated`);
        }
        await sleep(250);
      }
    }

    if (cache.__version !== CACHE_VERSION) {
      cache.__version = CACHE_VERSION;
      writeJson(cacheFile, cache);
    }

    const dictionary = {};
    for (const { key, source } of sourcePairs) {
      dictionary[key] = applyGlossary(cache[source] || source, locale);
    }
    for (const [key, value] of Object.entries(overrides[locale] || {})) {
      if (key in dictionary) dictionary[key] = value;
    }

    const sorted = Object.fromEntries(
      Object.entries(dictionary).sort(([a], [b]) => a.localeCompare(b, "en")),
    );
    const outputFile = path.join(OUTPUT_DIR, `${locale}.json`);
    writeJson(outputFile, sorted);
    console.log(`[${locale}] wrote ${Object.keys(sorted).length} entries to ${path.relative(root, outputFile)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
