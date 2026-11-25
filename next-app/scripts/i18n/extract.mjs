/**
 * Extract translatable English UI strings from the application source.
 *
 * The app is a large client-rendered Next.js application with English copy
 * written directly in JSX. Rather than hand-maintaining a key for every
 * sentence, we use the English copy itself as the translation key. This
 * script gathers the copy that can appear on screen, then
 * `build-dictionaries.mjs` translates it into the supported locales.
 *
 * Run with: npm run i18n:extract
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");
const srcRoot = path.join(root, "src");

const SCAN_DIRS = [
  "src/app",
  "src/components",
  "src/context",
  "src/features/pages",
  "src/lib",
];

// Data files contain proper nouns and catalogue rows, not UI copy.
const SKIP_FILES = new Set([
  "src/features/pages/types.ts",
  "src/features/transport/private-hire-data.ts",
  "src/lib/trips.ts",
]);

const ATTR_NAMES = new Set([
  "alt",
  "aria-description",
  "aria-label",
  "aria-placeholder",
  "label",
  "placeholder",
  "title",
]);

const UI_PROPS = new Set([
  "actionLabel",
  "buttonLabel",
  "cancelLabel",
  "caption",
  "confirmLabel",
  "copy",
  "cta",
  "description",
  "emptyMessage",
  "emptyText",
  "error",
  "errorMessage",
  "eyebrow",
  "heading",
  "helpText",
  "hint",
  "label",
  "message",
  "notice",
  "pinnedLabel",
  "placeholder",
  "subtitle",
  "successMessage",
  "text",
  "title",
  "tooltip",
]);

const UI_VARS = /(label|title|description|message|text|placeholder|error|success|empty|hint|help|note|subtitle|heading|caption|notice|tooltip|cta|status)/i;
const OPTION_VARS = /(options|labels|tabs|steps|slides|statuses|categories|filters|columns|choices|items|menu|nav)/i;
const UI_CALLS = /(toast\.|alert\(|confirm\(|set(Error|Message|Success|Notice|Status|Hint|Help)|Error\()/;

const BAD_TEXT = [
  /^(https?:|mailto:|tel:|data:|\/|#|\.\.?\/)/i,
  /^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i,
  /^[a-z][a-z0-9]*(?::[a-z][a-z0-9]*)+$/i, // permission keys: company:read
  /^[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$/, // camelCase identifier
  /^[a-z0-9]+(?:_[a-z0-9]+)+$/, // snake_case identifier
  /^[a-z0-9]+(?:-[a-z0-9]+)+$/, // kebab-case identifier
  /className|styles\.|var\(--|rgba?\(|hsla?\(|@media|url\(/i,
  /^--/,
  /^(?:sm|md|lg|xl|2xl):/i,
  /^(?:calc|env|var)\(/i,
  /^\d+(\.\d+)?(?:px|rem|em|vh|vw|dvh|svh|lvh|%)$/i,
  /^(?:system-ui|sans-serif|serif|monospace)\b/i,
  /\b(?:sans-serif|serif|monospace)$/i,
  /^dc--/i,
  /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WHERE|JOIN|GROUP BY|ORDER BY)\b/,
  /^<[a-z/]/i,
  /=>|===|!==|\{|\}|;|::/,
  /\bdata-[\w-]+|\baria-[\w-]+/i,
  /%[sd]/,
  /^[A-Z0-9_]+$/,
  /\.(png|jpe?g|webp|avif|svg|gif|css|tsx?|jsx?|json|pdf|csv)$/i,
  /^[a-z]+([A-Z][a-z0-9]*)+$/,
  /^[a-z0-9]+([_-][a-z0-9]+)+$/i,
  /^\d+(\.\d+)?(px|rem|em|vh|vw|%)?(\s+\d+(\.\d+)?(px|rem|em|vh|vw|%)?)+$/i,
  /^\d+(\.\d+)?(px|rem|em)\b/i,
  /^\d+(\.\d+)?\s+(auto|none|inherit|initial|unset)$/i,
  /^(auto|none|inherit|initial|unset|block|inline|flex|grid)(\s+(auto|none|inherit|initial|unset|block|inline|flex|grid))*$/i,
];

const ENTITIES = {
  amp: "&",
  apos: "'",
  copy: "©",
  gt: ">",
  hellip: "…",
  lt: "<",
  mdash: "—",
  nbsp: " ",
  ndash: "–",
  quot: '"',
  rsquo: "’",
  lsquo: "‘",
  ldquo: "“",
  rdquo: "”",
  reg: "®",
  trade: "™",
  times: "×",
};

// Some source strings were converted from UTF-8 to Windows-1252 in the past.
// Translate the clean text, but keep the original key so runtime lookups match.
const MOJIBAKE = [
  ["â€¦", "…"],
  ["â€™", "’"],
  ["â€œ", "“"],
  ["â€\u009d", "”"],
  ["â€“", "–"],
  ["â€”", "—"],
  ["Â·", "·"],
  ["Â", ""],
  ["â‚¬", "€"],
  ["â„¢", "™"],
  ["Ã©", "é"],
  ["Ã¨", "è"],
  ["Ã ", "à"],
  ["Ã¢", "â"],
  ["Ã§", "ç"],
  ["Ã´", "ô"],
  ["Ã»", "û"],
  ["Ã®", "î"],
  ["Ã¯", "ï"],
  ["Ã«", "ë"],
  ["Ã¼", "ü"],
  ["Ã¶", "ö"],
  ["Ã¤", "ä"],
  ["ÃŸ", "ß"],
];

function decodeEntities(value) {
  return value
    .replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity) => {
      if (entity[0] === "#") {
        const code = entity[1].toLowerCase() === "x"
          ? Number.parseInt(entity.slice(2), 16)
          : Number.parseInt(entity.slice(1), 10);
        return Number.isFinite(code) ? String.fromCodePoint(code) : match;
      }
      return ENTITIES[entity.toLowerCase()] ?? match;
    })
    .replace(/\s+/g, " ")
    .trim();
}

function demojibake(value) {
  let text = value;
  for (const [from, to] of MOJIBAKE) text = text.split(from).join(to);
  return text;
}

function looksTranslatable(value) {
  if (!value) return false;
  const text = value.trim();
  if (text.length < 2 || text.length > 400) return false;
  if (!/[A-Za-z]/.test(text)) return false;
  if (!/\s/.test(text) && text.length < 3) return false;
  return !BAD_TEXT.some((pattern) => pattern.test(text));
}

function propertyName(node) {
  if (!node) return "";
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
    return node.text;
  }
  return "";
}

function nearestUiContext(node) {
  let current = node.parent;
  while (current) {
    if (ts.isJsxExpression(current)) return true;
    if (ts.isPropertyAssignment(current) && UI_PROPS.has(propertyName(current.name))) {
      return true;
    }
    if (ts.isVariableDeclaration(current) && UI_VARS.test(propertyName(current.name))) {
      return true;
    }
    if (ts.isCallExpression(current) && UI_CALLS.test(current.getText().slice(0, 120))) {
      return true;
    }
    if (ts.isJsxAttribute(current)) return true;
    if (ts.isArrayLiteralExpression(current)) {
      const parent = current.parent;
      if (ts.isVariableDeclaration(parent) && OPTION_VARS.test(propertyName(parent.name))) {
        return true;
      }
      if (ts.isPropertyAssignment(parent) && UI_PROPS.has(propertyName(parent.name))) {
        return true;
      }
    }
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isArrowFunction(current) ||
      ts.isSourceFile(current)
    ) {
      return false;
    }
    current = current.parent;
  }
  return false;
}

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const files = SCAN_DIRS.flatMap((dir) => walk(path.join(root, dir)))
  .filter((file) => {
    const relative = path.relative(root, file).replaceAll("\\", "/");
    return !SKIP_FILES.has(relative);
  });

const strings = new Map();

function add(value) {
  // Runtime text nodes contain decoded entities, so the lookup key uses the
  // decoded source. Translations are generated from a repaired copy because a
  // handful of legacy strings were double-encoded.
  const key = decodeEntities(value);
  const source = demojibake(key);
  if (looksTranslatable(source)) strings.set(key, source);
}

for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(
    file,
    source,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );

  const visit = (node) => {
    if (ts.isJsxText(node)) {
      add(node.text);
    } else if (ts.isJsxAttribute(node)) {
      const attribute = node.name.getText();
      if (ATTR_NAMES.has(attribute) || UI_PROPS.has(attribute)) {
        if (node.initializer && ts.isStringLiteral(node.initializer)) {
          add(node.initializer.text);
        }
      }
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!ts.isJsxAttribute(node.parent) && nearestUiContext(node)) {
        add(node.text);
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
}

const sorted = [...strings.entries()]
  .map(([key, source]) => ({ key, source }))
  .sort((a, b) => a.key.localeCompare(b.key, "en"));
const outDir = path.join(root, "scripts/i18n");
fs.mkdirSync(outDir, { recursive: true });
const outFile = path.join(outDir, "source-strings.json");
fs.writeFileSync(outFile, JSON.stringify(sorted, null, 2) + "\n", "utf8");

console.log(`Scanned ${files.length} files.`);
console.log(`Wrote ${sorted.length} translatable strings to ${path.relative(root, outFile)}.`);
