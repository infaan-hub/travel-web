import "server-only";
import type { PlaceSuggestion } from "@/lib/place-types";
import { ZANZIBAR_TRIP_PLACES } from "@/lib/trips";
import { ZANZIBAR_PLACES } from "@/lib/zanzibar";

export type { PlaceSuggestion } from "@/lib/place-types";

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function dedupeKey(name: string, latitude: number, longitude: number): string {
  return `${normalize(name)}|${latitude.toFixed(2)}|${longitude.toFixed(2)}`;
}

function buildIndex(): PlaceSuggestion[] {
  const seen = new Set<string>();
  const places: PlaceSuggestion[] = [];

  for (const place of ZANZIBAR_TRIP_PLACES) {
    const key = dedupeKey(place.name, place.latitude, place.longitude);
    if (seen.has(key)) continue;
    seen.add(key);
    places.push({
      id: `trip-${place.id}`,
      name: place.name,
      category: place.category,
      area: place.area,
      region: null,
      district: null,
      latitude: place.latitude,
      longitude: place.longitude,
    });
  }

  for (const place of ZANZIBAR_PLACES) {
    const key = dedupeKey(place.name, place.latitude, place.longitude);
    if (seen.has(key)) continue;
    seen.add(key);
    places.push({
      id: `area-${normalize(place.name).replace(/\s+/g, "-")}-${place.latitude.toFixed(
        3,
      )}-${place.longitude.toFixed(3)}`,
      name: place.name,
      category: place.type.charAt(0).toUpperCase() + place.type.slice(1),
      area: place.region || place.district || "",
      region: place.region || null,
      district: place.district || null,
      latitude: place.latitude,
      longitude: place.longitude,
    });
  }

  return places;
}

const PLACES = buildIndex();

const POPULAR_PLACE_SPECS: ReadonlyArray<{ name: string; regionHint?: string }> = [
  { name: "Abeid Amani Karume International Airport" },
  { name: "Zanzibar Ferry Terminal" },
  { name: "Stone Town", regionHint: "unguja" },
  { name: "Nungwi", regionHint: "unguja" },
  { name: "Kendwa", regionHint: "unguja" },
  { name: "Paje", regionHint: "unguja" },
  { name: "Jambiani", regionHint: "unguja" },
  { name: "Kiwengwa", regionHint: "unguja" },
];

function buildPopularPlaces(): PlaceSuggestion[] {
  const result: PlaceSuggestion[] = [];
  const seenIds = new Set<string>();

  for (const spec of POPULAR_PLACE_SPECS) {
    const target = normalize(spec.name);
    const match = PLACES.find((place) => {
      if (normalize(place.name) !== target) return false;
      if (!spec.regionHint) return true;
      const areaText = normalize(
        [place.area, place.region, place.district].filter(Boolean).join(" "),
      );
      return areaText.includes(spec.regionHint);
    });
    if (match && !seenIds.has(match.id)) {
      seenIds.add(match.id);
      result.push(match);
    }
  }

  return result;
}

const POPULAR_PLACES = buildPopularPlaces();
const POPULAR_IDS = new Set(POPULAR_PLACES.map((place) => place.id));

/**
 * Curated high-frequency Zanzibar pickup and drop-off hubs shown as soon as a
 * traveler focuses an origin or destination field.
 */
export function getPopularTripPlaces(limit = 8): PlaceSuggestion[] {
  return POPULAR_PLACES.slice(0, Math.max(0, limit));
}

/**
 * Search the curated Zanzibar dataset. Prefix matches rank above substring
 * matches, and area/district names are searchable so "Nungwi" finds both the
 * village and nearby streets, hotels and beaches.
 */
export function searchTripPlaces(query: string, limit = 8): PlaceSuggestion[] {
  const needle = normalize(query);
  if (needle.length < 2) return [];

  const tokens = needle.split(" ").filter(Boolean);
  const matches: { place: PlaceSuggestion; score: number }[] = [];

  for (const place of PLACES) {
    const name = normalize(place.name);
    const haystack = normalize(
      [place.name, place.category, place.area, place.region, place.district]
        .filter(Boolean)
        .join(" "),
    );
    if (!tokens.every((token) => haystack.includes(token))) continue;

    let score = 0;
    if (name === needle) score += 120;
    else if (name.startsWith(needle)) score += 90;
    else if (name.includes(needle)) score += 65;

    if (place.area && normalize(place.area).includes(needle)) score += 30;
    if (place.region && normalize(place.region).includes(needle)) score += 20;
    if (place.district && normalize(place.district).includes(needle)) score += 20;
    if (normalize(place.category) === needle) score += 15;
    if (POPULAR_IDS.has(place.id)) score += 18;

    // Prefer concise, specific names when several places match equally.
    score += Math.max(0, 12 - Math.floor(name.length / 12));
    matches.push({ place, score });
  }

  matches.sort(
    (left, right) =>
      right.score - left.score || left.place.name.localeCompare(right.place.name),
  );

  return matches.slice(0, limit).map((match) => match.place);
}

/**
 * Progressive suggestions for autocomplete fields: returns popular hubs when
 * empty, prefix matches from the very first character, and full ranked search
 * from two characters onward.
 */
export function suggestTripPlaces(query: string, limit = 8): PlaceSuggestion[] {
  const needle = normalize(query);
  if (needle.length === 0) return getPopularTripPlaces(limit);
  if (needle.length >= 2) return searchTripPlaces(query, limit);

  const matches: { place: PlaceSuggestion; score: number }[] = [];
  for (const place of PLACES) {
    const name = normalize(place.name);
    const area = normalize(place.area);
    const matchesName = name.startsWith(needle);
    const matchesArea = area.startsWith(needle);
    if (!matchesName && !matchesArea) continue;

    let score = matchesName ? 80 : 40;
    if (POPULAR_IDS.has(place.id)) score += 60;
    if (normalize(place.category) === "transport") score += 25;
    score += Math.max(0, 12 - Math.floor(name.length / 12));
    matches.push({ place, score });
  }

  matches.sort(
    (left, right) =>
      right.score - left.score || left.place.name.localeCompare(right.place.name),
  );

  return matches.slice(0, limit).map((match) => match.place);
}
