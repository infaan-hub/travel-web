/**
 * Extract translatable English UI strings from the application source.
 *
 * Scans all UI directories (app pages, components, context, features, hooks,
 * and UI libraries), handles `as const` / `Record` lookup maps, JSX text,
 * attributes, template literal static segments, helper return statements, and
 * core dynamic pattern vocabulary.
 *
 * Run with: npm run i18n:extract
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "../..");

const SCAN_DIRS = [
  "src/app",
  "src/components",
  "src/context",
  "src/features",
  "src/hooks",
  "src/lib",
];

// Data/infrastructure files containing proper-noun datasets or server plumbing,
// not general UI copy.
const SKIP_FILES = new Set([
  "src/features/pages/types.ts",
  "src/lib/audit.ts",
  "src/lib/env.ts",
  "src/lib/env-public.ts",
  "src/lib/logging.ts",
  "src/lib/qr-code.ts",
  "src/lib/unguja-nearby.ts",
  "src/lib/zanzibar.ts",
  "src/lib/zanzibar-outline.ts",
  "src/lib/zanzibar-route-pricing.ts",
]);

const SKIP_PREFIXES = [
  "src/app/api/",
  "src/lib/api/",
  "src/lib/auth/",
  "src/lib/cache/",
  "src/lib/db/",
  "src/lib/serializers/",
  "src/lib/storage/",
  "src/lib/utils/",
];

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
  "alt",
  "ariaLabel",
  "badge",
  "badgeLabel",
  "buttonLabel",
  "callout",
  "cancelLabel",
  "cancelText",
  "caption",
  "category",
  "categoryLabel",
  "confirmLabel",
  "confirmText",
  "copy",
  "cta",
  "ctaLabel",
  "default",
  "description",
  "detail",
  "emptyDescription",
  "emptyMessage",
  "emptyText",
  "emptyTitle",
  "error",
  "errorMessage",
  "excludes",
  "eyebrow",
  "finishLabel",
  "headline",
  "heading",
  "help",
  "helpText",
  "helper",
  "helperText",
  "highlights",
  "hint",
  "includes",
  "kicker",
  "label",
  "loadingLabel",
  "loadingText",
  "message",
  "meta",
  "note",
  "notice",
  "pinnedLabel",
  "placeholder",
  "priceHint",
  "primaryLabel",
  "roleLabel",
  "secondaryLabel",
  "shortLabel",
  "sub",
  "subLabel",
  "subheadline",
  "sublabel",
  "subtitle",
  "successMessage",
  "summary",
  "tag",
  "tagline",
  "text",
  "title",
  "tooltip",
  "valueLabel",
]);

const UI_VARS =
  /(label|title|description|message|text|placeholder|error|success|empty|hint|help|note|subtitle|heading|caption|notice|tooltip|cta|status|copy|includes|excludes|categories|stages|badges|metadata|greeting|summary|headline|tagline|eyebrow|kicker)/i;
const OPTION_VARS =
  /(options|labels|tabs|steps|slides|statuses|categories|filters|columns|choices|items|menu|nav|presets|groups|days|months|roles|modes|tiers|stages|rules|features|highlights|services|reasons|sections|cards|links|actions)/i;
const UI_CALLS =
  /(toast\.|alert\(|confirm\(|prompt\(|set(Error|Message|Success|Notice|Status|Hint|Help|Warning|Title|Label)|ApiError\(|Error\()/;

// Acronyms, technical codes, and proper brand/currency tokens that stay unchanged.
const KEEP_UNTRANSLATED_UPPER = new Set([
  "A/C",
  "API",
  "BCP",
  "CSV",
  "CSRF",
  "DE",
  "EAT",
  "EN",
  "ES",
  "FR",
  "GPS",
  "HTML",
  "HTTP",
  "HTTPS",
  "ID",
  "IOS",
  "JPG",
  "JPEG",
  "JSON",
  "JWT",
  "KPI",
  "KPIS",
  "NIDA",
  "OG",
  "OS",
  "OTP",
  "PDF",
  "PNG",
  "PWA",
  "QR",
  "SEO",
  "SMTP",
  "SVG",
  "SW",
  "TSH",
  "TZ",
  "TZS",
  "UI",
  "URL",
  "USD",
  "UX",
  "VIP",
  "WEBP",
  "WGS84",
  "ZAN",
  "ZNZ",
]);

const ALLOWED_SHORT_WORDS = new Set([
  "At",
  "By",
  "Go",
  "In",
  "My",
  "No",
  "Of",
  "On",
  "Or",
  "To",
  "Up",
  "We",
  "at",
  "by",
  "in",
  "no",
  "of",
  "on",
  "or",
  "to",
  "up",
]);

const BAD_TEXT = [
  /^(https?:|mailto:|tel:|data:|\/|#|\.\.?\/)/i,
  /^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i,
  /^[a-z][a-z0-9]*(?::[a-z][a-z0-9]*)+$/i, // permission keys: company:read
  /^[a-z][a-zA-Z0-9]*[A-Z][a-zA-Z0-9]*$/, // camelCase identifier
  /^[a-z0-9]+(?:_[a-z0-9]+)+$/, // snake_case identifier
  /^[a-z0-9]+(?:-[a-z0-9]+)+$/, // kebab-case identifier (unless capitalized UI word)
  /^[A-Z0-9]+(?:_[A-Z0-9]+)+$/, // SCREAMING_SNAKE_CASE constant
  /className|styles\.|var\(--|rgba?\(|hsla?\(|@media|url\(/i,
  /^--/,
  /^(?:sm|md|lg|xl|2xl):/i,
  /^(?:calc|env|var)\(/i,
  /^\d+(\.\d+)?(?:px|rem|em|vh|vw|dvh|svh|lvh|%|ms|s)$/i,
  /^(?:system-ui|sans-serif|serif|monospace)\b/i,
  /\b(?:sans-serif|serif|monospace)$/i,
  /^dc--/i,
  /\b(SELECT|INSERT|UPDATE|DELETE|CREATE|ALTER|DROP|WHERE|JOIN|GROUP BY|ORDER BY)\b/,
  /^<[a-z/]/i,
  /=>|===|!==|\{|\}|;|::/,
  /\bdata-[\w-]+|\baria-[\w-]+/i,
  /%[sd]/,
  /\.(png|jpe?g|webp|avif|svg|gif|css|tsx?|jsx?|json|pdf|csv)$/i,
  /^\d+(\.\d+)?(px|rem|em|vh|vw|%)?(\s+\d+(\.\d+)?(px|rem|em|vh|vw|%)?)+$/i,
  /^\d+(\.\d+)?(px|rem|em)\b/i,
  /^\d+(\.\d+)?\s+(auto|none|inherit|initial|unset)$/i,
  /^(auto|none|inherit|initial|unset|block|inline|flex|grid|absolute|relative|fixed|sticky|hidden|visible|pointer|default|center|left|right|top|bottom|start|end|stretch|baseline|wrap|nowrap|row|column|cover|contain|fill|numeric|decimal|email|tel|url|search|password|text|number|checkbox|radio|submit|button|reset|date|time|file|GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS|application\/json|multipart\/form-data|image\/png|image\/jpeg|image\/webp|text\/plain|utf8|utf-8|no-store|same-origin|cors|omit|include|strict|lax|anonymous)(\s+(auto|none|inherit|initial|unset|block|inline|flex|grid|center|left|right|top|bottom))*$/i,
  /^[A-Z]{1,3}\s?\d{2,5}\s?[A-Z]{0,3}$/, // Plate examples like Z 441 AB
  /^#?[0-9a-fA-F]{6}$/, // Hex colors
  /\((?:max|min)-width\s*:/i, // Responsive image sizes attribute
  /^minmax\(/i, // CSS grid track sizing
  /^-[a-z0-9-]+$/i, // HTML id suffix fragments like -error, -hint, -option-
  /^[a-z0-9]+-$/i, // HTML id prefix fragments like modal-
  /\b(?:bg|text|border|hover|focus|ring|rounded|shadow|items|justify)-[a-z0-9/[\]-]+/i, // Tailwind utility class strings
];

// Core glue words, units, calendar names, status labels, and dynamic-pattern
// pieces used at runtime by src/i18n/translate.ts so dynamic strings never leak English.
const CORE_UI_VOCABULARY = [
  // Dynamic pattern glue words
  "Showing",
  "Page",
  "Section",
  "Step",
  "Introduction",
  "Image",
  "Day",
  "of",
  "to",
  "from",
  "From",
  "by",
  "for",
  "with",
  "and",
  "or",
  "Or",
  "in",
  "on",
  "at",
  "Up to",
  "up to",
  "per",
  "per person",
  "per trip",
  "per day",
  "per hour",
  "per night",
  "Updated",
  "Issued",
  "Created",
  "Assigned by",
  "Managed by",
  "View only",
  "View-only",
  "View only — managed by",
  "View-only access — managed by",
  "Registered directly by you",
  "your company",
  "Your company",
  "Recently",
  "completed",
  "registered",
  "available",
  "unavailable",
  "active",
  "paused",
  "pending",
  "confirmed",
  "cancelled",
  "expired",
  "left",
  "ago",
  "before pickup",
  "hours before pickup",
  "vehicle registered",
  "vehicles registered",
  "vehicle slot available",
  "vehicle slot active",
  "Assigned company services",
  // Common nouns (singular & plural) used with counts
  "Seat",
  "Seats",
  "seat",
  "seats",
  "Bag",
  "Bags",
  "bag",
  "bags",
  "pax",
  "Pax",
  "Guest",
  "Guests",
  "guest",
  "guests",
  "Adult",
  "Adults",
  "adult",
  "adults",
  "Child",
  "Children",
  "child",
  "children",
  "Person",
  "People",
  "person",
  "people",
  "Passenger",
  "Passengers",
  "passenger",
  "passengers",
  "Traveler",
  "Travelers",
  "traveler",
  "travelers",
  "Vehicle",
  "Vehicles",
  "vehicle",
  "vehicles",
  "Car",
  "Cars",
  "car",
  "cars",
  "Driver",
  "Drivers",
  "driver",
  "drivers",
  "Company",
  "Companies",
  "company",
  "companies",
  "Service",
  "Services",
  "service",
  "services",
  "Booking",
  "Bookings",
  "booking",
  "bookings",
  "Trip",
  "Trips",
  "trip",
  "trips",
  "Tour",
  "Tours",
  "tour",
  "tours",
  "Route",
  "Routes",
  "route",
  "routes",
  "Review",
  "Reviews",
  "review",
  "reviews",
  "Photo",
  "Photos",
  "photo",
  "photos",
  "Image",
  "Images",
  "image",
  "images",
  "Stop",
  "Stops",
  "stop",
  "stops",
  "Step",
  "Steps",
  "step",
  "steps",
  "Item",
  "Items",
  "item",
  "items",
  "Place",
  "Places",
  "place",
  "places",
  "Hotel",
  "Hotels",
  "hotel",
  "hotels",
  "Room",
  "Rooms",
  "room",
  "rooms",
  "Night",
  "Nights",
  "night",
  "nights",
  "Day",
  "Days",
  "day",
  "days",
  "Hour",
  "Hours",
  "hour",
  "hours",
  "Minute",
  "Minutes",
  "minute",
  "minutes",
  "mins",
  "min",
  "Week",
  "Weeks",
  "week",
  "weeks",
  "Month",
  "Months",
  "month",
  "months",
  "Year",
  "Years",
  "year",
  "years",
  "Result",
  "Results",
  "result",
  "results",
  "Message",
  "Messages",
  "message",
  "messages",
  "Request",
  "Requests",
  "request",
  "requests",
  "User",
  "Users",
  "user",
  "users",
  "Customer",
  "Customers",
  "customer",
  "customers",
  "Task",
  "Tasks",
  "task",
  "tasks",
  "default routes",
  "defaults",
  // Statuses, angles, roles & actions
  "All",
  "New",
  "Live",
  "Open",
  "Closed",
  "Pending",
  "Confirmed",
  "In progress",
  "Completed",
  "Cancelled",
  "Expired",
  "Available",
  "Unavailable",
  "Active",
  "Paused",
  "Draft",
  "Published",
  "Approved",
  "Rejected",
  "Archived",
  "Verified",
  "Unverified",
  "Front",
  "Side",
  "Back",
  "FRONT",
  "SIDE",
  "BACK",
  "Front view",
  "Side view",
  "Back view",
  "One-way",
  "Wait & return",
  "Full day",
  "Route table",
  "Standard",
  "View",
  "Delete",
  "Edit",
  "Save",
  "Close",
  "Search",
  "Share",
  "Download",
  "Print",
  "Copy",
  "Copied",
  "Refresh",
  "Refreshing…",
  "Saving…",
  "Deleting…",
  "Loading…",
  "Submitting…",
  "Sending…",
  "Installing…",
  "Optional",
  "Required",
  "Public Hire",
  "Private Hire",
  "Public Hire Driver",
  "Private Hire Driver",
  "Driver · Private Hire",
  "Boarding Stub",
  "Scan Pass",
  "Driver Pass",
  "Business card",
  "Edit card",
  "Close editor",
  "Save card",
  "Reset defaults",
  "Download as image",
  "Download as PDF",
  "Download app",
  "Got it",
  "Your device",
  "Driver information",
  "Vehicle information",
  "Pending vehicle",
  "Plate No.",
  "Category",
  "Capacity",
  "Vehicle",
  // Vehicle categories & standard amenities
  "Sedan",
  "SUV 4x4",
  "Minivan",
  "Safari Cruiser",
  "Coaster Bus",
  "Luxury VIP",
  "Fuel",
  "Mineral Water",
  "Luggage Assistance",
  "Driver Tips",
  "Park Entry Fees",
  "Fuel & Highway Tolls",
  "Air Conditioning",
  "Bottled Mineral Water",
  "Flight Delay Tracking",
  "Airport Meet & Greet",
  "Cold Towels & Water",
  "Luggage Porterage",
  "Driver Gratuity",
  "National Park Entry Fees",
  "Driver Tip",
  // TripPlaceCategory & TRIP_PLACE_GROUPS from src/lib/trips.ts
  "Attraction",
  "Attractions",
  "Activities",
  "Food & drink",
  "Stays",
  "Shopping",
  "Wellness",
  "Transport & health",
  "Areas & streets",
  "All places",
  "Bar",
  "Beach / Sandbank",
  "Cafe",
  "City",
  "District",
  "Health / Pharmacy",
  "Kitesurf School",
  "Region",
  "Restaurant",
  "Shop / Market",
  "Spa / Wellness",
  "Spice Farm",
  "Street",
  "Tour / Activity",
  "Transport",
  "Ward",
  "Wildlife / Turtles",
  "Heritage sites, beaches, wildlife and spice farms",
  "Tours, water sports and outdoor experiences",
  "Restaurants, cafes and bars",
  "Hotels, resorts and guest houses",
  "Markets, bazaars and local shops",
  "Spas, yoga studios and wellness centres",
  "Ferries, the airport, hospitals and pharmacies",
  "Regions, districts, cities, wards and streets",
  "Every point of interest in the dataset",
  // Days of week & months
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
  "Previous hours",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  // Common auth/Google strings
  "Sign in with Google",
  "Customer accounts only.",
  "Continue with Google",
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
        const code =
          entity[1].toLowerCase() === "x"
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
  if (text.length < 2 || text.length > 1200) return false;
  if (!/[A-Za-z]/.test(text)) return false;
  if (KEEP_UNTRANSLATED_UPPER.has(text.toUpperCase())) return false;
  if (!/\s/.test(text) && text.length < 3 && !ALLOWED_SHORT_WORDS.has(text)) {
    return false;
  }
  return !BAD_TEXT.some((pattern) => pattern.test(text));
}

function looksLikeHumanReturnString(value) {
  const text = value.trim();
  if (!looksTranslatable(text)) return false;
  // Multi-word English text in a return statement is almost always UI copy.
  if (/\s/.test(text)) return true;
  // Single capitalized English word (e.g. "Pending", "Completed", "Closed")
  return /^[A-Z][a-z]{2,24}[.?!…]?$/.test(text);
}

function propertyName(node) {
  if (!node) return "";
  if (ts.isIdentifier(node) || ts.isStringLiteral(node) || ts.isNumericLiteral(node)) {
    return node.text;
  }
  return "";
}

function unwrapExprParent(node) {
  let current = node;
  while (
    current &&
    (ts.isAsExpression(current) ||
      ts.isSatisfiesExpression(current) ||
      ts.isParenthesizedExpression(current) ||
      ts.isTypeAssertionExpression(current))
  ) {
    current = current.parent;
  }
  return current;
}

function nearestUiContext(node) {
  let current = node.parent;
  while (current) {
    if (ts.isJsxExpression(current)) {
      if (current.parent && ts.isJsxAttribute(current.parent)) {
        const attr = current.parent.name.getText();
        return ATTR_NAMES.has(attr) || UI_PROPS.has(attr);
      }
      return true;
    }
    if (ts.isJsxAttribute(current)) {
      const attr = current.name.getText();
      return ATTR_NAMES.has(attr) || UI_PROPS.has(attr);
    }
    if (ts.isPropertyAssignment(current) && UI_PROPS.has(propertyName(current.name))) {
      return true;
    }
    if (ts.isVariableDeclaration(current) && UI_VARS.test(propertyName(current.name))) {
      return true;
    }
    if (ts.isCallExpression(current) && UI_CALLS.test(current.getText().slice(0, 120))) {
      return true;
    }
    if (ts.isArrayLiteralExpression(current) || ts.isObjectLiteralExpression(current)) {
      const parent = unwrapExprParent(current.parent);
      if (
        parent &&
        ts.isVariableDeclaration(parent) &&
        (OPTION_VARS.test(propertyName(parent.name)) || UI_VARS.test(propertyName(parent.name)))
      ) {
        return true;
      }
      if (parent && ts.isPropertyAssignment(parent) && UI_PROPS.has(propertyName(parent.name))) {
        return true;
      }
    }
    if (
      ts.isFunctionDeclaration(current) ||
      ts.isArrowFunction(current) ||
      ts.isMethodDeclaration(current) ||
      ts.isSourceFile(current)
    ) {
      return false;
    }
    current = current.parent;
  }
  return false;
}

function isInReturnStatement(node) {
  let current = node.parent;
  while (current) {
    if (ts.isReturnStatement(current)) return true;
    if (
      ts.isJsxElement(current) ||
      ts.isJsxSelfClosingElement(current) ||
      ts.isCallExpression(current) ||
      ts.isBinaryExpression(current) ||
      ts.isPropertyAssignment(current) ||
      ts.isObjectLiteralExpression(current) ||
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
  if (!fs.existsSync(dir)) return [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (/\.(tsx|ts)$/.test(entry.name)) files.push(full);
  }
  return files;
}

const files = SCAN_DIRS.flatMap((dir) => walk(path.join(root, dir))).filter((file) => {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  if (SKIP_FILES.has(relative)) return false;
  if (SKIP_PREFIXES.some((prefix) => relative.startsWith(prefix))) return false;
  // src/lib/trips.ts has 1,000+ hotel proper names; its group/category labels are
  // explicitly listed in CORE_UI_VOCABULARY above.
  if (relative === "src/lib/trips.ts") return false;
  return true;
});

const apiFiles = walk(path.join(root, "src/app/api"));

const strings = new Map();

function add(value) {
  if (typeof value !== "string") return;
  const key = decodeEntities(value);
  const source = demojibake(key);
  if (looksTranslatable(source)) {
    strings.set(key, source);
  }
}

function addMaybeMultiline(value) {
  if (typeof value !== "string") return;
  if (value.includes("\n") && value.split("\n").length <= 12) {
    const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
    if (lines.length > 1 && lines.every((line) => line.length <= 80)) {
      for (const line of lines) add(line);
    }
  }
  add(value);
}

function addTemplateChunk(rawChunk) {
  const cleaned = decodeEntities(rawChunk)
    .replace(/^[\s·•|—–/:,.;!?()[\]]+/, "")
    .replace(/[\s·•|—–/:,;()[\]]+$/, "")
    .trim();
  if (cleaned) add(cleaned);
}

// 1. Seed with core UI vocabulary + overrides keys so dynamic patterns never miss.
for (const phrase of CORE_UI_VOCABULARY) {
  add(phrase);
}

const overridesFile = path.join(__dirname, "overrides.json");
if (fs.existsSync(overridesFile)) {
  try {
    const overrides = JSON.parse(fs.readFileSync(overridesFile, "utf8"));
    for (const localeMap of Object.values(overrides)) {
      if (!localeMap || typeof localeMap !== "object") continue;
      for (const key of Object.keys(localeMap)) {
        add(key);
      }
    }
  } catch {
    // Ignore malformed overrides during extraction
  }
}

// 2. Scan all UI source files
for (const file of files) {
  const relative = path.relative(root, file).replaceAll("\\", "/");
  const isSampleTransportData = relative === "src/features/transport/private-hire-data.ts";
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
    } else if (ts.isTemplateExpression(node)) {
      if (nearestUiContext(node)) {
        addTemplateChunk(node.head.text);
        for (const span of node.templateSpans) {
          addTemplateChunk(span.literal.text);
        }
      }
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      // Skip proper-noun fields inside sample data
      if (
        isSampleTransportData &&
        ts.isPropertyAssignment(node.parent) &&
        ["name", "slug", "plate_number", "email", "phone"].includes(propertyName(node.parent.name))
      ) {
        return;
      }
      if (!ts.isJsxAttribute(node.parent)) {
        if (nearestUiContext(node)) {
          addMaybeMultiline(node.text);
        } else if (isInReturnStatement(node) && looksLikeHumanReturnString(node.text)) {
          add(node.text);
        }
      }
    }
    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
}

// 3. Extract user-facing ApiError / toast error messages from src/app/api/**
for (const file of apiFiles) {
  const source = fs.readFileSync(file, "utf8");
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);

  const visit = (node) => {
    if (ts.isNewExpression(node) && node.expression.getText() === "ApiError" && node.arguments?.length >= 2) {
      const msgArg = node.arguments[1];
      if (ts.isStringLiteral(msgArg) || ts.isNoSubstitutionTemplateLiteral(msgArg)) {
        add(msgArg.text);
      }
    } else if (
      ts.isPropertyAssignment(node) &&
      (propertyName(node.name) === "message" || propertyName(node.name) === "detail") &&
      (ts.isStringLiteral(node.initializer) || ts.isNoSubstitutionTemplateLiteral(node.initializer))
    ) {
      if (looksLikeHumanReturnString(node.initializer.text)) {
        add(node.initializer.text);
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

console.log(`Scanned ${files.length} UI files + ${apiFiles.length} API files.`);
console.log(`Wrote ${sorted.length} translatable strings to ${path.relative(root, outFile)}.`);
