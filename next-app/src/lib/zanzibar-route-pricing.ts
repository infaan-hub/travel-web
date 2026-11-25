export const USD_TO_TZS_RATE = 2600;

export type TripPricingOption = "one_way" | "wait_and_return" | "full_day";

export const TRIP_PRICING_OPTIONS: ReadonlyArray<{
  key: TripPricingOption;
  label: string;
  shortLabel: string;
  description: string;
}> = [
  {
    key: "one_way",
    label: "One-way",
    shortLabel: "One-way",
    description: "Direct private transfer from pickup to drop-off.",
  },
  {
    key: "wait_and_return",
    label: "Wait & return",
    shortLabel: "Wait & return",
    description: "Driver waits at your destination and brings you back.",
  },
  {
    key: "full_day",
    label: "Full day Private charter",
    shortLabel: "Full day",
    description: "Dedicated private vehicle and driver for a full day.",
  },
];

export type StandardRoutePrice = {
  no: number;
  group: string;
  origin: string;
  destination: string;
  oneWayUsd: number;
  waitReturnUsd: number;
  fullDayUsd: number;
};

export type RoutePriceRecord = {
  id?: number;
  origin: string;
  destination: string;
  oneWayUsd: number;
  waitReturnUsd: number;
  fullDayUsd: number;
};

export type RoutePriceQuote = {
  matched: boolean;
  source: "custom" | "standard" | "distance_estimate" | "vehicle_default" | "service_fallback";
  matchedLabel: string;
  origin: string;
  destination: string;
  exchangeRate: number;
  oneWayUsd: number;
  waitReturnUsd: number;
  fullDayUsd: number;
  oneWayTzs: number;
  waitReturnTzs: number;
  fullDayTzs: number;
};

export function usdToTzs(usd: number): number {
  if (!Number.isFinite(usd) || usd < 0) return 0;
  return Math.round(usd * USD_TO_TZS_RATE);
}

export function tzsToUsd(tzs: number): number {
  if (!Number.isFinite(tzs) || tzs < 0) return 0;
  return Math.round((tzs / USD_TO_TZS_RATE) * 100) / 100;
}

export function formatUsd(usd: number): string {
  if (!Number.isFinite(usd)) return "$0";
  const rounded = Math.round(usd * 100) / 100;
  return Number.isInteger(rounded)
    ? `$${rounded.toLocaleString("en-US")}`
    : `$${rounded.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function formatTzs(tzs: number): string {
  if (!Number.isFinite(tzs)) return "TSh 0";
  return `TSh ${Math.round(tzs).toLocaleString("en-US")}`;
}

export function formatDualPrice(usd: number): string {
  return `${formatUsd(usd)} (${formatTzs(usdToTzs(usd))})`;
}

export function isTripPricingOption(value: unknown): value is TripPricingOption {
  return value === "one_way" || value === "wait_and_return" || value === "full_day";
}

export function getOptionPriceUsd(
  quote: Pick<RoutePriceQuote, "oneWayUsd" | "waitReturnUsd" | "fullDayUsd">,
  option: TripPricingOption,
): number {
  if (option === "wait_and_return") return quote.waitReturnUsd;
  if (option === "full_day") return quote.fullDayUsd;
  return quote.oneWayUsd;
}

/**
 * 100 pre-registered Zanzibar private hire routes across 10 major hubs.
 */
export const DEFAULT_ZANZIBAR_ROUTE_PRICES: readonly StandardRoutePrice[] = [
  // 1. Airport – Zanzibar destinations
  { no: 1, group: "Airport", origin: "Airport", destination: "Stone Town", oneWayUsd: 20, waitReturnUsd: 35, fullDayUsd: 100 },
  { no: 2, group: "Airport", origin: "Airport", destination: "Fumba", oneWayUsd: 25, waitReturnUsd: 40, fullDayUsd: 110 },
  { no: 3, group: "Airport", origin: "Airport", destination: "Mangapwani", oneWayUsd: 35, waitReturnUsd: 60, fullDayUsd: 120 },
  { no: 4, group: "Airport", origin: "Airport", destination: "Chwaka", oneWayUsd: 40, waitReturnUsd: 70, fullDayUsd: 130 },
  { no: 5, group: "Airport", origin: "Airport", destination: "Paje", oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 130 },
  { no: 6, group: "Airport", origin: "Airport", destination: "Jambiani", oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 130 },
  { no: 7, group: "Airport", origin: "Airport", destination: "Bwejuu", oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 130 },
  { no: 8, group: "Airport", origin: "Airport", destination: "Michamvi", oneWayUsd: 50, waitReturnUsd: 85, fullDayUsd: 140 },
  { no: 9, group: "Airport", origin: "Airport", destination: "Nungwi", oneWayUsd: 50, waitReturnUsd: 85, fullDayUsd: 140 },
  { no: 10, group: "Airport", origin: "Airport", destination: "Kizimkazi", oneWayUsd: 55, waitReturnUsd: 95, fullDayUsd: 150 },

  // 2. Stone Town – Zanzibar destinations
  { no: 11, group: "Stone Town", origin: "Stone Town", destination: "Airport", oneWayUsd: 20, waitReturnUsd: 35, fullDayUsd: 100 },
  { no: 12, group: "Stone Town", origin: "Stone Town", destination: "Fumba", oneWayUsd: 25, waitReturnUsd: 40, fullDayUsd: 110 },
  { no: 13, group: "Stone Town", origin: "Stone Town", destination: "Mangapwani", oneWayUsd: 30, waitReturnUsd: 50, fullDayUsd: 110 },
  { no: 14, group: "Stone Town", origin: "Stone Town", destination: "Chwaka", oneWayUsd: 35, waitReturnUsd: 60, fullDayUsd: 120 },
  { no: 15, group: "Stone Town", origin: "Stone Town", destination: "Paje", oneWayUsd: 40, waitReturnUsd: 70, fullDayUsd: 130 },
  { no: 16, group: "Stone Town", origin: "Stone Town", destination: "Jambiani", oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 130 },
  { no: 17, group: "Stone Town", origin: "Stone Town", destination: "Nungwi", oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 140 },
  { no: 18, group: "Stone Town", origin: "Stone Town", destination: "Kendwa", oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 140 },
  { no: 19, group: "Stone Town", origin: "Stone Town", destination: "Kiwengwa", oneWayUsd: 40, waitReturnUsd: 70, fullDayUsd: 130 },
  { no: 20, group: "Stone Town", origin: "Stone Town", destination: "Kizimkazi", oneWayUsd: 50, waitReturnUsd: 85, fullDayUsd: 140 },

  // 3. Fumba – Zanzibar destinations
  { no: 21, group: "Fumba", origin: "Fumba", destination: "Airport", oneWayUsd: 25, waitReturnUsd: 40, fullDayUsd: 110 },
  { no: 22, group: "Fumba", origin: "Fumba", destination: "Stone Town", oneWayUsd: 25, waitReturnUsd: 40, fullDayUsd: 110 },
  { no: 23, group: "Fumba", origin: "Fumba", destination: "Mangapwani", oneWayUsd: 35, waitReturnUsd: 60, fullDayUsd: 120 },
  { no: 24, group: "Fumba", origin: "Fumba", destination: "Chwaka", oneWayUsd: 40, waitReturnUsd: 70, fullDayUsd: 130 },
  { no: 25, group: "Fumba", origin: "Fumba", destination: "Paje", oneWayUsd: 40, waitReturnUsd: 70, fullDayUsd: 130 },
  { no: 26, group: "Fumba", origin: "Fumba", destination: "Jambiani", oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 130 },
  { no: 27, group: "Fumba", origin: "Fumba", destination: "Nungwi", oneWayUsd: 50, waitReturnUsd: 85, fullDayUsd: 140 },
  { no: 28, group: "Fumba", origin: "Fumba", destination: "Kendwa", oneWayUsd: 50, waitReturnUsd: 85, fullDayUsd: 140 },
  { no: 29, group: "Fumba", origin: "Fumba", destination: "Kiwengwa", oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 130 },
  { no: 30, group: "Fumba", origin: "Fumba", destination: "Kizimkazi", oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 140 },

  // 4. Mangapwani – Zanzibar destinations
  { no: 31, group: "Mangapwani", origin: "Mangapwani", destination: "Airport", oneWayUsd: 35, waitReturnUsd: 60, fullDayUsd: 120 },
  { no: 32, group: "Mangapwani", origin: "Mangapwani", destination: "Stone Town", oneWayUsd: 30, waitReturnUsd: 50, fullDayUsd: 110 },
  { no: 33, group: "Mangapwani", origin: "Mangapwani", destination: "Fumba", oneWayUsd: 35, waitReturnUsd: 60, fullDayUsd: 120 },
  { no: 34, group: "Mangapwani", origin: "Mangapwani", destination: "Nungwi", oneWayUsd: 35, waitReturnUsd: 60, fullDayUsd: 120 },
  { no: 35, group: "Mangapwani", origin: "Mangapwani", destination: "Kendwa", oneWayUsd: 40, waitReturnUsd: 70, fullDayUsd: 130 },
  { no: 36, group: "Mangapwani", origin: "Mangapwani", destination: "Paje", oneWayUsd: 50, waitReturnUsd: 85, fullDayUsd: 140 },
  { no: 37, group: "Mangapwani", origin: "Mangapwani", destination: "Jambiani", oneWayUsd: 50, waitReturnUsd: 85, fullDayUsd: 140 },
  { no: 38, group: "Mangapwani", origin: "Mangapwani", destination: "Kiwengwa", oneWayUsd: 40, waitReturnUsd: 70, fullDayUsd: 130 },
  { no: 39, group: "Mangapwani", origin: "Mangapwani", destination: "Matemwe", oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 140 },
  { no: 40, group: "Mangapwani", origin: "Mangapwani", destination: "Kizimkazi", oneWayUsd: 55, waitReturnUsd: 95, fullDayUsd: 150 },

  // 5. Nungwi – Zanzibar destinations
  { no: 41, group: "Nungwi", origin: "Nungwi", destination: "Airport", oneWayUsd: 50, waitReturnUsd: 85, fullDayUsd: 140 },
  { no: 42, group: "Nungwi", origin: "Nungwi", destination: "Stone Town", oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 140 },
  { no: 43, group: "Nungwi", origin: "Nungwi", destination: "Kendwa", oneWayUsd: 20, waitReturnUsd: 35, fullDayUsd: 110 },
  { no: 44, group: "Nungwi", origin: "Nungwi", destination: "Matemwe", oneWayUsd: 30, waitReturnUsd: 50, fullDayUsd: 120 },
  { no: 45, group: "Nungwi", origin: "Nungwi", destination: "Kiwengwa", oneWayUsd: 35, waitReturnUsd: 60, fullDayUsd: 120 },
  { no: 46, group: "Nungwi", origin: "Nungwi", destination: "Pwani Mchangani", oneWayUsd: 35, waitReturnUsd: 60, fullDayUsd: 120 },
  { no: 47, group: "Nungwi", origin: "Nungwi", destination: "Pongwe", oneWayUsd: 40, waitReturnUsd: 70, fullDayUsd: 130 },
  { no: 48, group: "Nungwi", origin: "Nungwi", destination: "Paje", oneWayUsd: 50, waitReturnUsd: 85, fullDayUsd: 150 },
  { no: 49, group: "Nungwi", origin: "Nungwi", destination: "Jambiani", oneWayUsd: 55, waitReturnUsd: 95, fullDayUsd: 150 },
  { no: 50, group: "Nungwi", origin: "Nungwi", destination: "Kizimkazi", oneWayUsd: 60, waitReturnUsd: 100, fullDayUsd: 160 },

  // 6. Kendwa – Zanzibar destinations
  { no: 51, group: "Kendwa", origin: "Kendwa", destination: "Airport", oneWayUsd: 50, waitReturnUsd: 85, fullDayUsd: 140 },
  { no: 52, group: "Kendwa", origin: "Kendwa", destination: "Stone Town", oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 140 },
  { no: 53, group: "Kendwa", origin: "Kendwa", destination: "Nungwi", oneWayUsd: 20, waitReturnUsd: 35, fullDayUsd: 110 },
  { no: 54, group: "Kendwa", origin: "Kendwa", destination: "Matemwe", oneWayUsd: 35, waitReturnUsd: 60, fullDayUsd: 120 },
  { no: 55, group: "Kendwa", origin: "Kendwa", destination: "Kiwengwa", oneWayUsd: 40, waitReturnUsd: 70, fullDayUsd: 130 },
  { no: 56, group: "Kendwa", origin: "Kendwa", destination: "Pwani Mchangani", oneWayUsd: 40, waitReturnUsd: 70, fullDayUsd: 130 },
  { no: 57, group: "Kendwa", origin: "Kendwa", destination: "Pongwe", oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 140 },
  { no: 58, group: "Kendwa", origin: "Kendwa", destination: "Paje", oneWayUsd: 50, waitReturnUsd: 85, fullDayUsd: 150 },
  { no: 59, group: "Kendwa", origin: "Kendwa", destination: "Jambiani", oneWayUsd: 55, waitReturnUsd: 95, fullDayUsd: 150 },
  { no: 60, group: "Kendwa", origin: "Kendwa", destination: "Kizimkazi", oneWayUsd: 60, waitReturnUsd: 100, fullDayUsd: 160 },

  // 7. Paje – Zanzibar destinations
  { no: 61, group: "Paje", origin: "Paje", destination: "Airport", oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 130 },
  { no: 62, group: "Paje", origin: "Paje", destination: "Stone Town", oneWayUsd: 40, waitReturnUsd: 70, fullDayUsd: 130 },
  { no: 63, group: "Paje", origin: "Paje", destination: "Jambiani", oneWayUsd: 20, waitReturnUsd: 35, fullDayUsd: 110 },
  { no: 64, group: "Paje", origin: "Paje", destination: "Bwejuu", oneWayUsd: 20, waitReturnUsd: 35, fullDayUsd: 110 },
  { no: 65, group: "Paje", origin: "Paje", destination: "Dongwe", oneWayUsd: 25, waitReturnUsd: 40, fullDayUsd: 110 },
  { no: 66, group: "Paje", origin: "Paje", destination: "Michamvi", oneWayUsd: 30, waitReturnUsd: 50, fullDayUsd: 120 },
  { no: 67, group: "Paje", origin: "Paje", destination: "Jozani Forest", oneWayUsd: 30, waitReturnUsd: 50, fullDayUsd: 120 },
  { no: 68, group: "Paje", origin: "Paje", destination: "Kiwengwa", oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 140 },
  { no: 69, group: "Paje", origin: "Paje", destination: "Nungwi", oneWayUsd: 50, waitReturnUsd: 85, fullDayUsd: 150 },
  { no: 70, group: "Paje", origin: "Paje", destination: "Kizimkazi", oneWayUsd: 40, waitReturnUsd: 70, fullDayUsd: 130 },

  // 8. Jambiani – Zanzibar destinations
  { no: 71, group: "Jambiani", origin: "Jambiani", destination: "Airport", oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 130 },
  { no: 72, group: "Jambiani", origin: "Jambiani", destination: "Stone Town", oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 130 },
  { no: 73, group: "Jambiani", origin: "Jambiani", destination: "Paje", oneWayUsd: 20, waitReturnUsd: 35, fullDayUsd: 110 },
  { no: 74, group: "Jambiani", origin: "Jambiani", destination: "Bwejuu", oneWayUsd: 20, waitReturnUsd: 35, fullDayUsd: 110 },
  { no: 75, group: "Jambiani", origin: "Jambiani", destination: "Makunduchi", oneWayUsd: 25, waitReturnUsd: 40, fullDayUsd: 110 },
  { no: 76, group: "Jambiani", origin: "Jambiani", destination: "Kizimkazi", oneWayUsd: 35, waitReturnUsd: 60, fullDayUsd: 120 },
  { no: 77, group: "Jambiani", origin: "Jambiani", destination: "Jozani Forest", oneWayUsd: 30, waitReturnUsd: 50, fullDayUsd: 120 },
  { no: 78, group: "Jambiani", origin: "Jambiani", destination: "Michamvi", oneWayUsd: 35, waitReturnUsd: 60, fullDayUsd: 120 },
  { no: 79, group: "Jambiani", origin: "Jambiani", destination: "Kiwengwa", oneWayUsd: 50, waitReturnUsd: 85, fullDayUsd: 140 },
  { no: 80, group: "Jambiani", origin: "Jambiani", destination: "Nungwi", oneWayUsd: 55, waitReturnUsd: 95, fullDayUsd: 150 },

  // 9. Kiwengwa – Zanzibar destinations
  { no: 81, group: "Kiwengwa", origin: "Kiwengwa", destination: "Airport", oneWayUsd: 40, waitReturnUsd: 70, fullDayUsd: 130 },
  { no: 82, group: "Kiwengwa", origin: "Kiwengwa", destination: "Stone Town", oneWayUsd: 40, waitReturnUsd: 70, fullDayUsd: 130 },
  { no: 83, group: "Kiwengwa", origin: "Kiwengwa", destination: "Nungwi", oneWayUsd: 35, waitReturnUsd: 60, fullDayUsd: 120 },
  { no: 84, group: "Kiwengwa", origin: "Kiwengwa", destination: "Kendwa", oneWayUsd: 40, waitReturnUsd: 70, fullDayUsd: 130 },
  { no: 85, group: "Kiwengwa", origin: "Kiwengwa", destination: "Matemwe", oneWayUsd: 25, waitReturnUsd: 40, fullDayUsd: 110 },
  { no: 86, group: "Kiwengwa", origin: "Kiwengwa", destination: "Pongwe", oneWayUsd: 20, waitReturnUsd: 35, fullDayUsd: 110 },
  { no: 87, group: "Kiwengwa", origin: "Kiwengwa", destination: "Uroa", oneWayUsd: 25, waitReturnUsd: 40, fullDayUsd: 110 },
  { no: 88, group: "Kiwengwa", origin: "Kiwengwa", destination: "Paje", oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 140 },
  { no: 89, group: "Kiwengwa", origin: "Kiwengwa", destination: "Jambiani", oneWayUsd: 50, waitReturnUsd: 85, fullDayUsd: 140 },
  { no: 90, group: "Kiwengwa", origin: "Kiwengwa", destination: "Michamvi", oneWayUsd: 40, waitReturnUsd: 70, fullDayUsd: 130 },

  // 10. Kizimkazi – Zanzibar destinations
  { no: 91, group: "Kizimkazi", origin: "Kizimkazi", destination: "Airport", oneWayUsd: 55, waitReturnUsd: 95, fullDayUsd: 150 },
  { no: 92, group: "Kizimkazi", origin: "Kizimkazi", destination: "Stone Town", oneWayUsd: 50, waitReturnUsd: 85, fullDayUsd: 140 },
  { no: 93, group: "Kizimkazi", origin: "Kizimkazi", destination: "Jambiani", oneWayUsd: 35, waitReturnUsd: 60, fullDayUsd: 120 },
  { no: 94, group: "Kizimkazi", origin: "Kizimkazi", destination: "Makunduchi", oneWayUsd: 25, waitReturnUsd: 40, fullDayUsd: 110 },
  { no: 95, group: "Kizimkazi", origin: "Kizimkazi", destination: "Paje", oneWayUsd: 40, waitReturnUsd: 70, fullDayUsd: 130 },
  { no: 96, group: "Kizimkazi", origin: "Kizimkazi", destination: "Jozani Forest", oneWayUsd: 35, waitReturnUsd: 60, fullDayUsd: 120 },
  { no: 97, group: "Kizimkazi", origin: "Kizimkazi", destination: "Bwejuu", oneWayUsd: 40, waitReturnUsd: 70, fullDayUsd: 130 },
  { no: 98, group: "Kizimkazi", origin: "Kizimkazi", destination: "Nungwi", oneWayUsd: 60, waitReturnUsd: 100, fullDayUsd: 160 },
  { no: 99, group: "Kizimkazi", origin: "Kizimkazi", destination: "Kendwa", oneWayUsd: 60, waitReturnUsd: 100, fullDayUsd: 160 },
  { no: 100, group: "Kizimkazi", origin: "Kizimkazi", destination: "Michamvi", oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 140 },
];

const PLACE_ALIAS_PATTERNS: ReadonlyArray<readonly [string, readonly string[]]> = [
  ["airport", ["abeid amani karume", "zanzibar airport", "international airport", "znz", "airport", "kisauni"]],
  ["stone town", ["stone town", "mji mkongwe", "forodhani", "zanzibar ferry", "ferry terminal", "darajani", "malindi"]],
  ["fumba", ["fumba"]],
  ["mangapwani", ["mangapwani"]],
  ["jozani forest", ["jozani"]],
  ["chwaka", ["chwaka"]],
  ["paje", ["paje"]],
  ["jambiani", ["jambiani"]],
  ["bwejuu", ["bwejuu"]],
  ["michamvi", ["michamvi", "pingwe", "the rock restaurant"]],
  ["nungwi", ["nungwi"]],
  ["kendwa", ["kendwa"]],
  ["kiwengwa", ["kiwengwa"]],
  ["kizimkazi", ["kizimkazi"]],
  ["matemwe", ["matemwe", "mnemba"]],
  ["pwani mchangani", ["pwani mchangani"]],
  ["pongwe", ["pongwe"]],
  ["dongwe", ["dongwe"]],
  ["makunduchi", ["makunduchi"]],
  ["uroa", ["uroa"]],
];

export function normalizeRoutePlaceKey(raw: string): string {
  const cleaned = raw
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, " ");
  if (!cleaned) return "";

  for (const [canonical, needles] of PLACE_ALIAS_PATTERNS) {
    for (const needle of needles) {
      if (cleaned.includes(needle)) return canonical;
    }
  }

  return cleaned.split(",")[0]?.trim() || cleaned;
}

function buildQuote(
  origin: string,
  destination: string,
  oneWayUsd: number,
  waitReturnUsd: number,
  fullDayUsd: number,
  matched: boolean,
  source: RoutePriceQuote["source"],
  matchedLabel: string,
): RoutePriceQuote {
  const ow = Math.round(oneWayUsd * 100) / 100;
  const wr = Math.round(waitReturnUsd * 100) / 100;
  const fd = Math.round(fullDayUsd * 100) / 100;
  return {
    matched,
    source,
    matchedLabel,
    origin,
    destination,
    exchangeRate: USD_TO_TZS_RATE,
    oneWayUsd: ow,
    waitReturnUsd: wr,
    fullDayUsd: fd,
    oneWayTzs: usdToTzs(ow),
    waitReturnTzs: usdToTzs(wr),
    fullDayTzs: usdToTzs(fd),
  };
}

function estimateFromDistanceKm(distanceKm: number): {
  oneWayUsd: number;
  waitReturnUsd: number;
  fullDayUsd: number;
} {
  if (distanceKm <= 12) return { oneWayUsd: 20, waitReturnUsd: 35, fullDayUsd: 100 };
  if (distanceKm <= 22) return { oneWayUsd: 25, waitReturnUsd: 40, fullDayUsd: 110 };
  if (distanceKm <= 32) return { oneWayUsd: 35, waitReturnUsd: 60, fullDayUsd: 120 };
  if (distanceKm <= 45) return { oneWayUsd: 45, waitReturnUsd: 75, fullDayUsd: 130 };
  if (distanceKm <= 58) return { oneWayUsd: 50, waitReturnUsd: 85, fullDayUsd: 140 };
  if (distanceKm <= 72) return { oneWayUsd: 55, waitReturnUsd: 95, fullDayUsd: 150 };
  return { oneWayUsd: 60, waitReturnUsd: 100, fullDayUsd: 160 };
}

function findMatchingRoute(
  originKey: string,
  destKey: string,
  records: readonly RoutePriceRecord[],
): RoutePriceRecord | null {
  if (!originKey || !destKey) return null;

  // 1) Exact directional match
  for (const row of records) {
    if (
      normalizeRoutePlaceKey(row.origin) === originKey &&
      normalizeRoutePlaceKey(row.destination) === destKey
    ) {
      return row;
    }
  }

  // 2) Reverse directional match
  for (const row of records) {
    if (
      normalizeRoutePlaceKey(row.origin) === destKey &&
      normalizeRoutePlaceKey(row.destination) === originKey
    ) {
      return row;
    }
  }

  return null;
}

/**
 * Resolves a customer-facing route fare quote in both USD and TSh across all 3
 * options (One-way, Wait & return, Full day Private charter).
 *
 * Priority:
 * 1. Provider/company custom route price table (`customPrices`)
 * 2. Pre-registered 100 Zanzibar standard routes (`DEFAULT_ZANZIBAR_ROUTE_PRICES`)
 * 3. Distance-based Zanzibar fare band (`distanceKm`)
 * 4. Vehicle default prices (`vehicleDefaults`)
 * 5. Service base price (`fallbackServicePriceUsd`)
 */
export function resolveRoutePriceQuote(params: {
  origin: string;
  destination: string;
  customPrices?: readonly RoutePriceRecord[];
  distanceKm?: number | null;
  vehicleDefaults?: {
    oneWayUsd?: number | null;
    waitReturnUsd?: number | null;
    fullDayUsd?: number | null;
  } | null;
  fallbackServicePriceUsd?: number | null;
}): RoutePriceQuote {
  const originClean = params.origin.trim();
  const destClean = params.destination.trim();
  const originKey = normalizeRoutePlaceKey(originClean);
  const destKey = normalizeRoutePlaceKey(destClean);

  if (params.customPrices && params.customPrices.length > 0) {
    const customHit = findMatchingRoute(originKey, destKey, params.customPrices);
    if (customHit) {
      return buildQuote(
        originClean || customHit.origin,
        destClean || customHit.destination,
        customHit.oneWayUsd,
        customHit.waitReturnUsd,
        customHit.fullDayUsd,
        true,
        "custom",
        `${customHit.origin} – ${customHit.destination}`,
      );
    }
  }

  const standardHit = findMatchingRoute(originKey, destKey, DEFAULT_ZANZIBAR_ROUTE_PRICES);
  if (standardHit) {
    return buildQuote(
      originClean || standardHit.origin,
      destClean || standardHit.destination,
      standardHit.oneWayUsd,
      standardHit.waitReturnUsd,
      standardHit.fullDayUsd,
      true,
      "standard",
      `${standardHit.origin} – ${standardHit.destination}`,
    );
  }

  if (
    typeof params.distanceKm === "number" &&
    Number.isFinite(params.distanceKm) &&
    params.distanceKm > 0
  ) {
    const est = estimateFromDistanceKm(params.distanceKm);
    return buildQuote(
      originClean,
      destClean,
      est.oneWayUsd,
      est.waitReturnUsd,
      est.fullDayUsd,
      false,
      "distance_estimate",
      `Estimated by route distance (${Math.round(params.distanceKm)} km)`,
    );
  }

  const vd = params.vehicleDefaults;
  if (vd && vd.oneWayUsd != null && vd.oneWayUsd > 0) {
    const ow = vd.oneWayUsd;
    const wr = vd.waitReturnUsd != null && vd.waitReturnUsd > 0 ? vd.waitReturnUsd : Math.round(ow * 1.7);
    const fd = vd.fullDayUsd != null && vd.fullDayUsd > 0 ? vd.fullDayUsd : Math.max(100, Math.round(ow * 2.8));
    return buildQuote(originClean, destClean, ow, wr, fd, false, "vehicle_default", "Vehicle standard tariff");
  }

  if (
    typeof params.fallbackServicePriceUsd === "number" &&
    Number.isFinite(params.fallbackServicePriceUsd) &&
    params.fallbackServicePriceUsd > 0
  ) {
    const ow = params.fallbackServicePriceUsd;
    const wr = Math.round(ow * 1.7);
    const fd = Math.max(100, Math.round(ow * 2.8));
    return buildQuote(originClean, destClean, ow, wr, fd, false, "service_fallback", "Service base rate");
  }

  return buildQuote(originClean, destClean, 35, 60, 120, false, "distance_estimate", "Standard Zanzibar rate");
}
