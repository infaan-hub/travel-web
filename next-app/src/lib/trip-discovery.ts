// Curated Zanzibar trip suggestions, destinations, top-rated & most-booked
// reference routes, and client-side favorites persistence for /trips/.

export type DestinationCategory =
  | "beaches"
  | "heritage"
  | "nature"
  | "dining"
  | "resorts";

export type TripEndpoint = {
  label: string;
  lat: number;
  lng: number;
};

export type CuratedDestination = {
  id: string;
  name: string;
  area: string;
  category: DestinationCategory;
  categoryLabel: string;
  summary: string;
  rating: number;
  reviews: number;
  lat: number;
  lng: number;
  approxFromAirportKm: number;
  approxFromAirportMins: number;
};

export type CuratedTripRoute = {
  id: string;
  title: string;
  badge: string;
  origin: TripEndpoint;
  destination: TripEndpoint;
  distanceKm: number;
  durationMins: number;
  rating: number;
  reviews: number;
  bookingCount?: number;
  priceHint?: string;
  summary: string;
};

export type FavoriteTripKind =
  | "measured"
  | "destination"
  | "top_rated"
  | "most_booked"
  | "company_trip";

export type FavoriteTripRecord = {
  id: string;
  kind: FavoriteTripKind;
  title: string;
  subtitle: string;
  origin?: TripEndpoint;
  destination?: TripEndpoint;
  distanceKm?: number | null;
  durationMins?: number | null;
  rating?: number | null;
  priceLabel?: string | null;
  href?: string;
  savedAt: string;
};

export const FAVORITE_TRIPS_STORAGE_KEY = "travel.favoriteTrips.v1";

export const AIRPORT_HUB: TripEndpoint = {
  label: "Abeid Amani Karume International Airport, Stone Town / Airport",
  lat: -6.218534,
  lng: 39.221379,
};

export const STONE_TOWN_HUB: TripEndpoint = {
  label: "Stone Town, Unguja West Region",
  lat: -6.162,
  lng: 39.192,
};

export const FERRY_HUB: TripEndpoint = {
  label: "Zanzibar Ferry Terminal, Stone Town / Airport",
  lat: -6.15791,
  lng: 39.191998,
};

export const MEASURE_PRESETS: ReadonlyArray<{
  id: string;
  label: string;
  origin: TripEndpoint;
  destination: TripEndpoint;
}> = [
  {
    id: "preset-airport-nungwi",
    label: "Airport → Nungwi",
    origin: AIRPORT_HUB,
    destination: { label: "Nungwi, Unguja North Region", lat: -5.727227, lng: 39.299202 },
  },
  {
    id: "preset-airport-paje",
    label: "Airport → Paje",
    origin: AIRPORT_HUB,
    destination: { label: "Paje, Unguja South Region", lat: -6.266745, lng: 39.534072 },
  },
  {
    id: "preset-stonetown-kendwa",
    label: "Stone Town → Kendwa",
    origin: STONE_TOWN_HUB,
    destination: { label: "Kendwa Rocks Beach Hotel, Kendwa", lat: -5.752008, lng: 39.289778 },
  },
  {
    id: "preset-stonetown-rock",
    label: "Stone Town → The Rock",
    origin: STONE_TOWN_HUB,
    destination: { label: "The Rock Restaurant Zanzibar, Michamvi / Pingwe", lat: -6.152066, lng: 39.519409 },
  },
  {
    id: "preset-airport-kiwengwa",
    label: "Airport → Kiwengwa",
    origin: AIRPORT_HUB,
    destination: { label: "Kiwengwa, Unguja North Region", lat: -5.990104, lng: 39.376077 },
  },
];

export const DESTINATION_FILTERS: ReadonlyArray<{
  id: "all" | DestinationCategory;
  label: string;
}> = [
  { id: "all", label: "All destinations" },
  { id: "beaches", label: "Beaches" },
  { id: "heritage", label: "Heritage & Culture" },
  { id: "nature", label: "Spice & Nature" },
  { id: "dining", label: "Dining & Icons" },
  { id: "resorts", label: "Resorts" },
];

export const CURATED_DESTINATIONS: ReadonlyArray<CuratedDestination> = [
  {
    id: "dest-nungwi",
    name: "Nungwi Beach & North Coast",
    area: "Unguja North",
    category: "beaches",
    categoryLabel: "Beach",
    summary: "Calm turquoise waters, sunset dhow cruises, and vibrant oceanfront stays at the northern tip.",
    rating: 4.8,
    reviews: 2193,
    lat: -5.727227,
    lng: 39.299202,
    approxFromAirportKm: 64,
    approxFromAirportMins: 78,
  },
  {
    id: "dest-kendwa",
    name: "Kendwa Beach",
    area: "Unguja North",
    category: "beaches",
    categoryLabel: "Beach",
    summary: "Wide white-sand shoreline with all-day swimming, golden sunsets, and famous beachfront hotels.",
    rating: 4.7,
    reviews: 4742,
    lat: -5.752008,
    lng: 39.289778,
    approxFromAirportKm: 61,
    approxFromAirportMins: 72,
  },
  {
    id: "dest-paje",
    name: "Paje Lagoon & Kitesurf Coast",
    area: "Unguja South",
    category: "beaches",
    categoryLabel: "Beach",
    summary: "World-renowned shallow turquoise lagoon, breezy cafes, kitesurf schools, and relaxed coastal energy.",
    rating: 4.8,
    reviews: 1240,
    lat: -6.266745,
    lng: 39.534072,
    approxFromAirportKm: 50,
    approxFromAirportMins: 60,
  },
  {
    id: "dest-mtende",
    name: "Mtende Secret Beach",
    area: "South Coast",
    category: "beaches",
    categoryLabel: "Beach",
    summary: "Dramatic coral-cliff cove on the southern tip with striking tides and unforgettable ocean views.",
    rating: 4.7,
    reviews: 1870,
    lat: -6.461721,
    lng: 39.539505,
    approxFromAirportKm: 69,
    approxFromAirportMins: 82,
  },
  {
    id: "dest-stonetown",
    name: "Stone Town & Old Fort (UNESCO)",
    area: "Unguja West",
    category: "heritage",
    categoryLabel: "Heritage",
    summary: "Carved wooden doors, spice markets, Forodhani night food stalls, and centuries of Swahili history.",
    rating: 4.6,
    reviews: 4807,
    lat: -6.16135,
    lng: 39.189057,
    approxFromAirportKm: 8.5,
    approxFromAirportMins: 16,
  },
  {
    id: "dest-jozani",
    name: "Jozani Chwaka Bay Forest",
    area: "Central Unguja",
    category: "nature",
    categoryLabel: "Nature",
    summary: "Home to Zanzibar's rare red colobus monkeys, lush mahogany canopy, and boardwalk mangrove trails.",
    rating: 4.6,
    reviews: 3586,
    lat: -6.241557,
    lng: 39.41395,
    approxFromAirportKm: 34,
    approxFromAirportMins: 42,
  },
  {
    id: "dest-kidichi-spice",
    name: "Kidichi Spice Farms",
    area: "Central Highlands",
    category: "nature",
    categoryLabel: "Spice Farm",
    summary: "Guided tropical farm walks tasting fresh cloves, vanilla, cardamom, cinnamon, and seasonal fruit.",
    rating: 4.9,
    reviews: 311,
    lat: -6.089911,
    lng: 39.237256,
    approxFromAirportKm: 19,
    approxFromAirportMins: 28,
  },
  {
    id: "dest-the-rock",
    name: "The Rock Restaurant (Pingwe)",
    area: "Michamvi / Pingwe",
    category: "dining",
    categoryLabel: "Iconic Dining",
    summary: "Zanzibar's iconic ocean-perched seafood restaurant surrounded by crystal tides on the east coast.",
    rating: 4.7,
    reviews: 9691,
    lat: -6.152066,
    lng: 39.519409,
    approxFromAirportKm: 62,
    approxFromAirportMins: 74,
  },
  {
    id: "dest-kiwengwa",
    name: "Kiwengwa Resort Coast",
    area: "North-East Coast",
    category: "resorts",
    categoryLabel: "Resorts",
    summary: "Long palm-fringed beachfront lined with luxury resorts, spas, and tranquil sunrise views.",
    rating: 4.7,
    reviews: 2114,
    lat: -5.990104,
    lng: 39.376077,
    approxFromAirportKm: 44,
    approxFromAirportMins: 55,
  },
];

export const CURATED_TOP_RATED_TRIPS: ReadonlyArray<CuratedTripRoute> = [
  {
    id: "top-kidichi-spice",
    title: "Stone Town → Kidichi Spice Farm Heritage Drive",
    badge: "Top rated",
    origin: STONE_TOWN_HUB,
    destination: {
      label: "To The Hill Kidichi Spice Farm, Around Unguja",
      lat: -6.089911,
      lng: 39.237256,
    },
    distanceKm: 16,
    durationMins: 26,
    rating: 4.9,
    reviews: 311,
    priceHint: "From $35",
    summary: "Short scenic drive into the spice hills for fresh tastings and guided botanical walks.",
  },
  {
    id: "top-nungwi-luxury",
    title: "Stone Town → Nungwi Sunset Coast",
    badge: "Top rated",
    origin: STONE_TOWN_HUB,
    destination: {
      label: "SafiraBlu Luxury Resort & Villas, Nungwi",
      lat: -5.766796,
      lng: 39.338296,
    },
    distanceKm: 58,
    durationMins: 70,
    rating: 4.9,
    reviews: 158,
    priceHint: "From $65",
    summary: "Direct northern coastal transfer through rural villages to Nungwi's sunset beaches.",
  },
  {
    id: "top-mtende-cove",
    title: "Stone Town → Mtende Secret Beach Cove",
    badge: "Top rated",
    origin: STONE_TOWN_HUB,
    destination: {
      label: "Mtende Beach, Around Unguja",
      lat: -6.461721,
      lng: 39.539505,
    },
    distanceKm: 71,
    durationMins: 84,
    rating: 4.7,
    reviews: 1870,
    priceHint: "From $75",
    summary: "Full south-coast excursion to Zanzibar's dramatic cliff-framed secret beach.",
  },
  {
    id: "top-the-rock-pingwe",
    title: "Airport (ZNZ) → The Rock & Pingwe Coast",
    badge: "Top rated",
    origin: AIRPORT_HUB,
    destination: {
      label: "The Rock Restaurant Zanzibar, Michamvi / Pingwe",
      lat: -6.152066,
      lng: 39.519409,
    },
    distanceKm: 62,
    durationMins: 74,
    rating: 4.7,
    reviews: 9691,
    priceHint: "From $65",
    summary: "Cross-island drive via Jozani Forest straight to Michamvi peninsula and Pingwe.",
  },
  {
    id: "top-kiwengwa-spa",
    title: "Stone Town → Kiwengwa Beachfront Resorts",
    badge: "Top rated",
    origin: STONE_TOWN_HUB,
    destination: {
      label: "Zanzibella Hotel & Spa, Kiwengwa",
      lat: -6.00309,
      lng: 39.383339,
    },
    distanceKm: 43,
    durationMins: 54,
    rating: 4.7,
    reviews: 653,
    priceHint: "From $55",
    summary: "Smooth east-coast journey to palm-lined Kiwengwa beach hotels and ocean spas.",
  },
  {
    id: "top-paje-boutique",
    title: "Airport (ZNZ) → Paje Turquoise Lagoon",
    badge: "Top rated",
    origin: AIRPORT_HUB,
    destination: {
      label: "The 5th Element Boutique Hotel, Paje",
      lat: -6.263221,
      lng: 39.53483,
    },
    distanceKm: 50,
    durationMins: 60,
    rating: 4.9,
    reviews: 42,
    priceHint: "From $55",
    summary: "Direct highway route past Jozani straight to Paje's kitesurfing shoreline.",
  },
];

export const CURATED_MOST_BOOKED_TRIPS: ReadonlyArray<CuratedTripRoute> = [
  {
    id: "booked-airport-nungwi",
    title: "ZNZ Airport → Nungwi Beach",
    badge: "#1 Most booked",
    origin: AIRPORT_HUB,
    destination: {
      label: "Nungwi, Unguja North Region",
      lat: -5.727227,
      lng: 39.299202,
    },
    distanceKm: 64,
    durationMins: 78,
    rating: 4.8,
    reviews: 2193,
    priceHint: "From $60",
    summary: "Zanzibar's #1 private arrival transfer from Abeid Amani Karume Airport to northern resorts.",
  },
  {
    id: "booked-airport-kendwa",
    title: "ZNZ Airport → Kendwa Beach",
    badge: "Popular transfer",
    origin: AIRPORT_HUB,
    destination: {
      label: "Kendwa Rocks Beach Hotel, Kendwa",
      lat: -5.752008,
      lng: 39.289778,
    },
    distanceKm: 61,
    durationMins: 72,
    rating: 4.7,
    reviews: 4742,
    priceHint: "From $60",
    summary: "Fast, air-conditioned direct airport pickup to Kendwa sunset beachfront hotels.",
  },
  {
    id: "booked-airport-paje",
    title: "ZNZ Airport → Paje & Jambiani",
    badge: "Popular transfer",
    origin: AIRPORT_HUB,
    destination: {
      label: "Paje, Unguja South Region",
      lat: -6.266745,
      lng: 39.534072,
    },
    distanceKm: 50,
    durationMins: 60,
    rating: 4.8,
    reviews: 1240,
    priceHint: "From $50",
    summary: "South-east coast transfer favored by surfers, families, and boutique resort guests.",
  },
  {
    id: "booked-airport-stonetown",
    title: "ZNZ Airport → Stone Town Hotels",
    badge: "Quick transfer",
    origin: AIRPORT_HUB,
    destination: STONE_TOWN_HUB,
    distanceKm: 8.5,
    durationMins: 16,
    rating: 4.6,
    reviews: 4807,
    priceHint: "From $20",
    summary: "Express meet-and-greet airport arrival directly to Stone Town boutique hotels and ferry pier.",
  },
  {
    id: "booked-ferry-jambiani",
    title: "Zanzibar Ferry Terminal → Jambiani",
    badge: "Coastal favorite",
    origin: FERRY_HUB,
    destination: {
      label: "Jambiani, Unguja South Region",
      lat: -6.321892,
      lng: 39.546793,
    },
    distanceKm: 56,
    durationMins: 68,
    rating: 4.7,
    reviews: 1271,
    priceHint: "From $55",
    summary: "Seamless port pickup after arriving by ferry from Dar es Salaam to Jambiani's quiet beaches.",
  },
  {
    id: "booked-stonetown-jozani",
    title: "Stone Town → Jozani Forest & Kuza Cave",
    badge: "Day trip hit",
    origin: STONE_TOWN_HUB,
    destination: {
      label: "Jozani Chwaka Bay Forest (National Park), Around Unguja",
      lat: -6.241557,
      lng: 39.41395,
    },
    distanceKm: 36,
    durationMins: 44,
    rating: 4.6,
    reviews: 3586,
    priceHint: "From $45",
    summary: "Half-day wildlife & cave excursion combining red colobus monkeys with crystal cave swimming.",
  },
];

export function formatTripDistance(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return "";
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

export function formatTripDuration(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return "";
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

export function googleMapsDirectionsUrl(
  origin: { lat: number; lng: number },
  destination: { lat: number; lng: number },
): string {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${destination.lat},${destination.lng}`;
}

export function measuredTripFavoriteId(
  originLabel: string,
  destLabel: string,
): string {
  const norm = (text: string) =>
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  return `measured:${norm(originLabel)}__${norm(destLabel)}`;
}

export function loadFavoriteTrips(): FavoriteTripRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(FAVORITE_TRIPS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is FavoriteTripRecord =>
        typeof item === "object" &&
        item !== null &&
        typeof item.id === "string" &&
        typeof item.title === "string",
    );
  } catch {
    return [];
  }
}

export function saveFavoriteTrips(items: FavoriteTripRecord[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      FAVORITE_TRIPS_STORAGE_KEY,
      JSON.stringify(items.slice(0, 50)),
    );
  } catch {
    // Ignore quota/private-mode storage errors.
  }
}

export function toggleFavoriteTrip(
  current: FavoriteTripRecord[],
  record: FavoriteTripRecord,
): { next: FavoriteTripRecord[]; added: boolean } {
  const exists = current.some((item) => item.id === record.id);
  if (exists) {
    return {
      next: current.filter((item) => item.id !== record.id),
      added: false,
    };
  }
  return {
    next: [record, ...current],
    added: true,
  };
}
