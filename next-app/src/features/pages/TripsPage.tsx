"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import {
  AlertCircle,
  ArrowRight,
  ArrowUpDown,
  Award,
  Car,
  ChevronDown,
  ChevronUp,
  Clock,
  Compass,
  ExternalLink,
  Flame,
  Heart,
  Loader2,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  Navigation,
  Route as RouteIcon,
  Search,
  Star,
  Trash2,
} from "lucide-react";
import { geocodeAPI, routeAPI, tripsAPI } from "@/lib/api/client";
import { readClientCache, writeClientCache } from "@/lib/cache/client-cache";
import { getImageUrl, isUnoptimizableImage } from "@/lib/utils/image-url";
import { tripPlaceNameForCoords } from "@/lib/trips";
import { useToast } from "@/components/ToastProvider";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import ZanzibarAttractions from "@/components/ZanzibarAttractions";
import type { PlaceSuggestion } from "@/lib/place-types";
import type { CompanyTrip } from "@/features/pages/types";
import {
  AIRPORT_HUB,
  CURATED_DESTINATIONS,
  CURATED_MOST_BOOKED_TRIPS,
  CURATED_TOP_RATED_TRIPS,
  DESTINATION_FILTERS,
  MEASURE_PRESETS,
  buildBookingDestinationHref,
  formatTripDistance,
  formatTripDuration,
  googleMapsDirectionsUrl,
  loadFavoriteTrips,
  measuredTripFavoriteId,
  saveFavoriteTrips,
  toggleFavoriteTrip,
  type CuratedDestination,
  type CuratedTripRoute,
  type DestinationCategory,
  type FavoriteTripRecord,
  type TripEndpoint,
} from "@/lib/trip-discovery";
import styles from "@/features/pages/trips-hub.module.css";

const TripRouteOverlayMap = dynamic(
  () => import("@/components/TripRouteOverlayMap"),
  {
    ssr: false,
    loading: () => (
      <div className={styles.mapLoading}>
        <Loader2 className={styles.spin} size={18} aria-hidden="true" />
        <span>Loading Zanzibar route map…</span>
      </div>
    ),
  },
);

type PopularRouteRow = {
  origin: string;
  destination: string;
  booking_count: number;
  origin_lat: number | null;
  origin_lng: number | null;
  dest_lat: number | null;
  dest_lng: number | null;
  distance_km: number | null;
  duration_mins: number | null;
};

type CompanyStatRow = {
  company_id: number;
  rating: number;
  review_count: number;
  booking_count: number;
};

type MeasuredRoute = {
  key: string;
  distanceKm: number;
  durationMins: number;
  source: string;
};

type PostedSort = "newest" | "price_asc" | "price_desc" | "favorites";

function placeLabel(place: PlaceSuggestion): string {
  const name = place.name.trim();
  const area = place.area?.trim();
  if (area && !name.toLowerCase().includes(area.toLowerCase())) {
    return `${name}, ${area}`.slice(0, 255);
  }
  return name.slice(0, 255);
}

function favoriteKindLabel(kind: FavoriteTripRecord["kind"]): string {
  switch (kind) {
    case "measured":
      return "Measured trip";
    case "destination":
      return "Destination";
    case "top_rated":
      return "Top rated";
    case "most_booked":
      return "Most booked";
    case "company_trip":
      return "Company trip";
  }
}

export default function TripsPage() {
  const toast = useToast();

  // Live company trips + popular route aggregates
  const [trips, setTrips] = useState<CompanyTrip[]>(
    () => readClientCache<CompanyTrip[]>("travel.trips.all") ?? [],
  );
  const [loadingTrips, setLoadingTrips] = useState<boolean>(
    () => !readClientCache<CompanyTrip[]>("travel.trips.all"),
  );
  const [popularRoutes, setPopularRoutes] = useState<PopularRouteRow[]>([]);
  const [companyStats, setCompanyStats] = useState<CompanyStatRow[]>([]);

  // Favorites (persisted in localStorage, hydrated safely on client mount)
  const [favorites, setFavorites] = useState<FavoriteTripRecord[]>([]);

  // Trip Measurer state
  const [originLabel, setOriginLabel] = useState("");
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [originSource, setOriginSource] = useState<"none" | "suggestion" | "gps" | "custom">("none");

  const [destLabel, setDestLabel] = useState("");
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destSource, setDestSource] = useState<"none" | "suggestion" | "custom">("none");

  const [locating, setLocating] = useState(false);
  const [measuringManual, setMeasuringManual] = useState(false);
  const [measureError, setMeasureError] = useState("");
  const [showRouteMap, setShowRouteMap] = useState(false);
  const [routeResult, setRouteResult] = useState<{
    key: string;
    route: MeasuredRoute | null;
    error: string;
  } | null>(null);

  // Discovery filter states
  const [destCategory, setDestCategory] = useState<"all" | DestinationCategory>("all");
  const [postedSearch, setPostedSearch] = useState("");
  const [postedSort, setPostedSort] = useState<PostedSort>("newest");

  useEffect(() => {
    let active = true;
    const saved = loadFavoriteTrips();
    if (saved.length > 0) {
      Promise.resolve().then(() => {
        if (active) setFavorites(saved);
      });
    }
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    tripsAPI
      .getAll()
      .then((res) => {
        if (!active) return;
        const nextTrips: CompanyTrip[] = res.data?.results || res.data || [];
        setTrips(nextTrips);
        writeClientCache("travel.trips.all", nextTrips);
      })
      .catch(() => {
        // Keep cached or empty state on network failure.
      })
      .finally(() => {
        if (active) setLoadingTrips(false);
      });

    tripsAPI
      .getPopular()
      .then((res) => {
        if (!active) return;
        setPopularRoutes(
          Array.isArray(res.data?.most_booked_routes)
            ? (res.data.most_booked_routes as PopularRouteRow[])
            : [],
        );
        setCompanyStats(
          Array.isArray(res.data?.company_stats)
            ? (res.data.company_stats as CompanyStatRow[])
            : [],
        );
      })
      .catch(() => {
        // Curated popular routes remain available.
      });

    return () => {
      active = false;
    };
  }, []);

  // Auto-calculate route whenever both coordinates are set
  const routeKey =
    originCoords && destCoords
      ? `${originCoords.lat},${originCoords.lng},${destCoords.lat},${destCoords.lng}`
      : null;
  const routeMatches = routeKey != null && routeResult?.key === routeKey;
  const activeRoute = routeMatches ? routeResult.route : null;
  const activeRouteError = routeMatches ? routeResult.error : "";
  const calculatingRoute = Boolean(routeKey) && !routeMatches;

  useEffect(() => {
    if (!routeKey || !originCoords || !destCoords) return;

    let active = true;
    const requestKey = routeKey;

    routeAPI
      .calculate({
        origin_lat: originCoords.lat,
        origin_lng: originCoords.lng,
        destination_lat: destCoords.lat,
        destination_lng: destCoords.lng,
      })
      .then((response) => {
        if (!active) return;
        const data = response.data ?? {};
        const distanceKm = Number(data.distance_km);
        const durationMins = Number(
          data.duration_mins ?? data.estimated_time_mins,
        );
        if (Number.isFinite(distanceKm) && Number.isFinite(durationMins)) {
          setRouteResult({
            key: requestKey,
            route: {
              key: requestKey,
              distanceKm,
              durationMins,
              source: String(data.source ?? "estimate"),
            },
            error: "",
          });
        } else {
          setRouteResult({
            key: requestKey,
            route: null,
            error: "Could not compute distance for these points.",
          });
        }
      })
      .catch(() => {
        if (!active) return;
        setRouteResult({
          key: requestKey,
          route: null,
          error:
            "Routing service is temporarily unavailable. Please try again in a moment.",
        });
      });

    return () => {
      active = false;
    };
  }, [destCoords, originCoords, routeKey]);

  const favoriteIds = useMemo(
    () => new Set(favorites.map((item) => item.id)),
    [favorites],
  );

  const handleToggleFavorite = useCallback(
    (record: FavoriteTripRecord) => {
      setFavorites((current) => {
        const { next, added } = toggleFavoriteTrip(current, record);
        saveFavoriteTrips(next);
        if (added) {
          toast.success(`Saved “${record.title}” to your favorite trips.`);
        } else {
          toast.info(`Removed “${record.title}” from favorites.`);
        }
        return next;
      });
    },
    [toast],
  );

  const clearAllFavorites = () => {
    setFavorites([]);
    saveFavoriteTrips([]);
    toast.info("Cleared all saved favorite trips.");
  };

  const loadIntoMeasurer = useCallback(
    (
      origin: TripEndpoint,
      destination: TripEndpoint,
      openMap = false,
    ) => {
      setMeasureError("");
      setOriginLabel(origin.label);
      setOriginCoords({ lat: origin.lat, lng: origin.lng });
      setOriginSource("suggestion");
      setDestLabel(destination.label);
      setDestCoords({ lat: destination.lat, lng: destination.lng });
      setDestSource("suggestion");
      if (openMap) setShowRouteMap(true);

      if (typeof window !== "undefined") {
        document
          .getElementById("measure-trip")
          ?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    },
    [],
  );

  const measureDestination = (destination: CuratedDestination) => {
    const startOrigin: TripEndpoint =
      originCoords && originLabel.trim()
        ? { label: originLabel.trim(), lat: originCoords.lat, lng: originCoords.lng }
        : AIRPORT_HUB;

    loadIntoMeasurer(startOrigin, {
      label: `${destination.name}, ${destination.area}`,
      lat: destination.lat,
      lng: destination.lng,
    });
  };

  const handleUseMyLocation = () => {
    setMeasureError("");
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setMeasureError(
        "Your browser does not support GPS location. Pick a Zanzibar suggestion instead.",
      );
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = Number(position.coords.latitude.toFixed(5));
        const lng = Number(position.coords.longitude.toFixed(5));
        let label = `Current location (${lat.toFixed(4)}, ${lng.toFixed(4)})`;

        try {
          const response = await fetch(
            `/api/geocode/reverse?lat=${lat}&lng=${lng}`,
            {
              credentials: "include",
              headers: { Accept: "application/json" },
            },
          );
          if (response.ok) {
            const data = (await response.json()) as { display_name?: unknown };
            if (typeof data.display_name === "string" && data.display_name.trim()) {
              label = data.display_name.trim().slice(0, 255);
            }
          }
        } catch {
          // Keep coordinates label if reverse geocoding is unavailable.
        }

        setOriginLabel(label);
        setOriginCoords({ lat, lng });
        setOriginSource("gps");
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        setMeasureError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission denied. Search and choose a pickup location instead."
            : "Could not detect your current location. Search for a pickup location instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  };

  const handleSwap = () => {
    setOriginLabel(destLabel);
    setOriginCoords(destCoords);
    setOriginSource(destSource === "none" ? "none" : "suggestion");
    setDestLabel(originLabel);
    setDestCoords(originCoords);
    setDestSource(originSource === "none" ? "none" : "suggestion");
    setMeasureError("");
  };

  const handleManualMeasure = async () => {
    setMeasureError("");
    const oText = originLabel.trim();
    const dText = destLabel.trim();

    if (oText.length < 2 || dText.length < 2) {
      setMeasureError("Enter both an origin and destination to measure the trip.");
      return;
    }
    if (oText.toLowerCase() === dText.toLowerCase()) {
      setMeasureError("Origin and destination must be different.");
      return;
    }

    if (originCoords && destCoords) {
      // Already measured or currently measuring via coordinates.
      return;
    }

    setMeasuringManual(true);
    try {
      let resolvedOrigin = originCoords;
      let resolvedDest = destCoords;

      if (!resolvedOrigin) {
        const res = await geocodeAPI.search(oText);
        const lat = Number(res.data?.lat);
        const lng = Number(res.data?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          throw new Error("Could not find coordinates for that origin in Zanzibar.");
        }
        resolvedOrigin = { lat, lng };
        setOriginCoords(resolvedOrigin);
        setOriginSource("custom");
      }

      if (!resolvedDest) {
        const res = await geocodeAPI.search(dText);
        const lat = Number(res.data?.lat);
        const lng = Number(res.data?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          throw new Error(
            "Could not find coordinates for that destination in Zanzibar.",
          );
        }
        resolvedDest = { lat, lng };
        setDestCoords(resolvedDest);
        setDestSource("custom");
      }
    } catch (cause) {
      setMeasureError(
        cause instanceof Error
          ? cause.message
          : "Pick a suggested Zanzibar location for both points to measure exact distance.",
      );
    } finally {
      setMeasuringManual(false);
    }
  };

  const resetMeasurer = () => {
    setOriginLabel("");
    setOriginCoords(null);
    setOriginSource("none");
    setDestLabel("");
    setDestCoords(null);
    setDestSource("none");
    setMeasureError("");
    setShowRouteMap(false);
    setRouteResult(null);
  };

  // Build merged Most Booked list (live DB bookings first, then curated Zanzibar leaders)
  const mostBookedTrips = useMemo<CuratedTripRoute[]>(() => {
    const liveCards: CuratedTripRoute[] = [];
    const seenKeys = new Set<string>();

    for (const row of popularRoutes) {
      if (
        row.origin_lat == null ||
        row.origin_lng == null ||
        row.dest_lat == null ||
        row.dest_lng == null
      ) {
        continue;
      }
      const key = `${row.origin.toLowerCase()}->${row.destination.toLowerCase()}`;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);

      liveCards.push({
        id: `live-booked-${key.replace(/[^a-z0-9]+/g, "-").slice(0, 48)}`,
        title: `${row.origin.split(",")[0]} → ${row.destination.split(",")[0]}`,
        badge:
          row.booking_count === 1
            ? "Recently booked"
            : `${row.booking_count} booked`,
        origin: {
          label: row.origin,
          lat: row.origin_lat,
          lng: row.origin_lng,
        },
        destination: {
          label: row.destination,
          lat: row.dest_lat,
          lng: row.dest_lng,
        },
        distanceKm: row.distance_km ?? 0,
        durationMins: row.duration_mins ?? 0,
        rating: 4.8,
        reviews: row.booking_count,
        bookingCount: row.booking_count,
        summary: "Popular private hire route booked by travelers on Travel.",
      });
    }

    const combined = [...liveCards];
    for (const curated of CURATED_MOST_BOOKED_TRIPS) {
      if (combined.length >= 6) break;
      const key = `${curated.origin.label.toLowerCase()}->${curated.destination.label.toLowerCase()}`;
      if (!seenKeys.has(key)) {
        seenKeys.add(key);
        combined.push(curated);
      }
    }

    return combined.slice(0, 6);
  }, [popularRoutes]);

  // Enrich posted company trips with any live company ratings & booking stats
  const companyStatMap = useMemo(() => {
    const map = new Map<number, CompanyStatRow>();
    for (const row of companyStats) {
      map.set(row.company_id, row);
    }
    return map;
  }, [companyStats]);

  const topRatedTrips = useMemo<CuratedTripRoute[]>(() => {
    // Include posted company trips that have real reviews + coordinates first
    const ratedCompanyTrips: CuratedTripRoute[] = trips
      .map((trip) => {
        const stat = trip.company_id ? companyStatMap.get(trip.company_id) : undefined;
        const oLat = trip.origin_latitude ?? trip.latitude;
        const oLng = trip.origin_longitude ?? trip.longitude;
        const dLat = trip.destination_latitude;
        const dLng = trip.destination_longitude;
        if (
          !stat ||
          stat.rating < 4 ||
          oLat == null ||
          oLng == null ||
          dLat == null ||
          dLng == null
        ) {
          return null;
        }
        const originName =
          trip.place || tripPlaceNameForCoords(oLat, oLng) || "Origin";
        const destName = tripPlaceNameForCoords(dLat, dLng) || "Destination";
        return {
          id: `company-trip-${trip.id}`,
          title: trip.title,
          badge: `${stat.rating.toFixed(1)} ★ Top rated`,
          origin: { label: originName, lat: oLat, lng: oLng },
          destination: { label: destName, lat: dLat, lng: dLng },
          distanceKm: Number(trip.distance_km ?? 0),
          durationMins: Number(trip.duration_mins ?? 0),
          rating: stat.rating,
          reviews: stat.review_count,
          priceHint: trip.price ? `$${trip.price}` : undefined,
          summary:
            trip.description ||
            (trip.company_name ? `Hosted by ${trip.company_name}.` : "Verified Zanzibar trip."),
        } as CuratedTripRoute;
      })
      .filter((item): item is CuratedTripRoute => item !== null)
      .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);

    return [...ratedCompanyTrips, ...CURATED_TOP_RATED_TRIPS].slice(0, 6);
  }, [companyStatMap, trips]);

  const filteredDestinations = useMemo(() => {
    if (destCategory === "all") return CURATED_DESTINATIONS;
    return CURATED_DESTINATIONS.filter((item) => item.category === destCategory);
  }, [destCategory]);

  const filteredPostedTrips = useMemo(() => {
    const query = postedSearch.trim().toLowerCase();
    const list = trips.filter((trip) => {
      if (postedSort === "favorites" && !favoriteIds.has(`company-trip-${trip.id}`)) {
        return false;
      }
      if (!query) return true;
      const haystack = [trip.title, trip.place, trip.company_name, trip.description]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });

    if (postedSort === "price_asc") {
      return [...list].sort(
        (a, b) => Number(a.price ?? Number.MAX_SAFE_INTEGER) - Number(b.price ?? Number.MAX_SAFE_INTEGER),
      );
    }
    if (postedSort === "price_desc") {
      return [...list].sort(
        (a, b) => Number(b.price ?? 0) - Number(a.price ?? 0),
      );
    }
    return list;
  }, [favoriteIds, postedSearch, postedSort, trips]);

  const currentMeasuredFavId =
    originLabel.trim() && destLabel.trim()
      ? measuredTripFavoriteId(originLabel, destLabel)
      : "";
  const isCurrentMeasuredFav =
    Boolean(currentMeasuredFavId) && favoriteIds.has(currentMeasuredFavId);

  return (
    <div id="trips-hub-root" className={`page ${styles.page}`}>
      <div className={styles.content}>
        {/* QUICK SECTION JUMP BAR */}
        <nav className={styles.jumpNav} aria-label="Trips sections">
          <a href="#measure-trip" className={styles.jumpLink}>
            <RouteIcon size={14} aria-hidden="true" />
            Measure Trip
          </a>
          <a href="#suggested-destinations" className={styles.jumpLink}>
            <Compass size={14} aria-hidden="true" />
            Destinations
          </a>
          <a href="#zanzibar-attractions" className={styles.jumpLink}>
            <MapIcon size={14} aria-hidden="true" />
            Attractions &amp; Places
          </a>
          <a href="#most-booked-trips" className={styles.jumpLink}>
            <Flame size={14} aria-hidden="true" />
            Most Booked
          </a>
          <a href="#top-rated-trips" className={styles.jumpLink}>
            <Award size={14} aria-hidden="true" />
            Top Rated
          </a>
          <a
            href="#favorite-trips"
            className={`${styles.jumpLink} ${styles.jumpLinkFav}`}
          >
            <Heart
              size={14}
              fill={favorites.length > 0 ? "currentColor" : "none"}
              aria-hidden="true"
            />
            Favorites ({favorites.length})
          </a>
          <a href="#posted-trips" className={styles.jumpLink}>
            <Car size={14} aria-hidden="true" />
            Posted Trips
          </a>
        </nav>

      {/* SECTION 1: INTERACTIVE TRIP MEASURER */}
      <section
        id="measure-trip"
        className={styles.section}
        aria-labelledby="measure-trip-heading"
      >
        <header className={styles.sectionHead}>
          <div className={styles.sectionHeadCopy}>
            <span className={styles.sectionEyebrow}>
              <RouteIcon size={13} aria-hidden="true" />
              Live route measurer
            </span>
            <h2 id="measure-trip-heading" className={styles.sectionTitle}>
              Measure any Zanzibar trip
            </h2>
            <p className={styles.sectionLead}>
              Pick your origin and destination from instant suggestions or use
              your current GPS location to see road distance, travel time, and
              the live map route.
            </p>
          </div>
        </header>

        <div className={styles.measurerCard}>
          <div className={styles.measurerLayout}>
            <div className={styles.measurerInputs}>
              <div className={styles.presetsRow}>
                <span className={styles.presetsLabel}>Quick measure:</span>
                {MEASURE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className={styles.presetChip}
                    onClick={() =>
                      loadIntoMeasurer(preset.origin, preset.destination)
                    }
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <PlaceAutocomplete
                label="Origin (Start point)"
                name="measure-origin"
                variant="origin"
                value={originLabel}
                pinned={originCoords != null}
                pinnedLabel={originSource === "gps" ? "GPS" : "Pinned"}
                placeholder="Start typing e.g. Airport, Stone Town, Nungwi…"
                onChange={(value) => {
                  setOriginLabel(value);
                  setOriginCoords(null);
                  setOriginSource("none");
                  setMeasureError("");
                }}
                onSelect={(place) => {
                  setOriginLabel(placeLabel(place));
                  setOriginCoords({ lat: place.latitude, lng: place.longitude });
                  setOriginSource("suggestion");
                  setMeasureError("");
                }}
                onCustomConfirm={(value) => {
                  setOriginLabel(value);
                  setOriginCoords(null);
                  setOriginSource("custom");
                }}
                action={
                  <button
                    type="button"
                    className={styles.locationButton}
                    onClick={handleUseMyLocation}
                    disabled={locating}
                  >
                    {locating ? (
                      <Loader2
                        size={15}
                        className={styles.spin}
                        aria-hidden="true"
                      />
                    ) : (
                      <LocateFixed size={15} aria-hidden="true" />
                    )}
                    {locating ? "Locating…" : "Use current location"}
                  </button>
                }
              />

              <div className={styles.swapRow}>
                <span className={styles.swapLine} aria-hidden="true" />
                <button
                  type="button"
                  className={styles.swapButton}
                  onClick={handleSwap}
                  disabled={!originLabel.trim() && !destLabel.trim()}
                >
                  <ArrowUpDown size={13} aria-hidden="true" />
                  Swap origin &amp; destination
                </button>
                <span className={styles.swapLine} aria-hidden="true" />
              </div>

              <PlaceAutocomplete
                label="Destination (End point)"
                name="measure-destination"
                variant="destination"
                value={destLabel}
                pinned={destCoords != null}
                pinnedLabel="Pinned"
                placeholder="Start typing e.g. Kendwa, Paje, The Rock, Jambiani…"
                onChange={(value) => {
                  setDestLabel(value);
                  setDestCoords(null);
                  setDestSource("none");
                  setMeasureError("");
                }}
                onSelect={(place) => {
                  setDestLabel(placeLabel(place));
                  setDestCoords({ lat: place.latitude, lng: place.longitude });
                  setDestSource("suggestion");
                  setMeasureError("");
                }}
                onCustomConfirm={(value) => {
                  setDestLabel(value);
                  setDestCoords(null);
                  setDestSource("custom");
                }}
              />

              {measureError ? (
                <p className={styles.alertError} role="alert">
                  <AlertCircle size={16} aria-hidden="true" />
                  <span>{measureError}</span>
                </p>
              ) : null}

              <div className={styles.measurerActions}>
                <button
                  type="button"
                  className={styles.measureButton}
                  disabled={
                    measuringManual ||
                    calculatingRoute ||
                    !originLabel.trim() ||
                    !destLabel.trim()
                  }
                  onClick={() => void handleManualMeasure()}
                >
                  {measuringManual || calculatingRoute ? (
                    <>
                      <Loader2
                        size={17}
                        className={styles.spin}
                        aria-hidden="true"
                      />
                      Measuring route…
                    </>
                  ) : (
                    <>
                      <Navigation size={17} aria-hidden="true" />
                      Measure trip distance &amp; time
                    </>
                  )}
                </button>

                {originLabel || destLabel ? (
                  <button
                    type="button"
                    className={styles.clearMeasureButton}
                    onClick={resetMeasurer}
                  >
                    Clear
                  </button>
                ) : null}
              </div>
            </div>

            {/* Live Measured Result Panel */}
            <div className={styles.resultPanel} aria-live="polite">
              {calculatingRoute ? (
                <div className={styles.resultEmpty}>
                  <span className={styles.resultEmptyIcon}>
                    <Loader2
                      size={24}
                      className={styles.spin}
                      aria-hidden="true"
                    />
                  </span>
                  <h3>Calculating your trip…</h3>
                  <p>
                    Fetching road driving distance and estimated journey time
                    across Zanzibar.
                  </p>
                </div>
              ) : activeRoute && originCoords && destCoords ? (
                <>
                  <div className={styles.resultHead}>
                    <span className={styles.resultBadge}>
                      <RouteIcon size={13} aria-hidden="true" />
                      Trip measured
                    </span>
                    <button
                      type="button"
                      className={`${styles.favButton} ${
                        isCurrentMeasuredFav ? styles.favButtonActive : ""
                      }`}
                      aria-pressed={isCurrentMeasuredFav}
                      onClick={() =>
                        handleToggleFavorite({
                          id: currentMeasuredFavId,
                          kind: "measured",
                          title: `${originLabel.split(",")[0]} → ${destLabel.split(",")[0]}`,
                          subtitle: `${formatTripDistance(activeRoute.distanceKm)} · ${formatTripDuration(activeRoute.durationMins)}`,
                          origin: {
                            label: originLabel,
                            lat: originCoords.lat,
                            lng: originCoords.lng,
                          },
                          destination: {
                            label: destLabel,
                            lat: destCoords.lat,
                            lng: destCoords.lng,
                          },
                          distanceKm: activeRoute.distanceKm,
                          durationMins: activeRoute.durationMins,
                          href: buildBookingDestinationHref(
                            {
                              label: destLabel,
                              lat: destCoords.lat,
                              lng: destCoords.lng,
                            },
                            destLabel,
                          ),
                          savedAt: new Date().toISOString(),
                        })
                      }
                    >
                      <Heart
                        size={14}
                        fill={isCurrentMeasuredFav ? "currentColor" : "none"}
                        aria-hidden="true"
                      />
                      {isCurrentMeasuredFav ? "Favorited" : "Save trip"}
                    </button>
                  </div>

                  <div className={styles.resultStats}>
                    <div className={styles.resultStatBox}>
                      <span className={styles.resultStatLabel}>Distance</span>
                      <strong className={styles.resultStatValue}>
                        {formatTripDistance(activeRoute.distanceKm)}
                      </strong>
                    </div>
                    <div className={styles.resultStatBox}>
                      <span className={styles.resultStatLabel}>Travel time</span>
                      <strong className={styles.resultStatValue}>
                        {formatTripDuration(activeRoute.durationMins)}
                      </strong>
                    </div>
                    <div className={styles.resultStatBox}>
                      <span className={styles.resultStatLabel}>Route type</span>
                      <strong className={styles.resultStatValue}>
                        {activeRoute.source === "osrm" ? "Road" : "Estimate"}
                      </strong>
                    </div>
                  </div>

                  <div className={styles.routeSummaryBox}>
                    <div className={styles.routeStop}>
                      <span className={styles.pinA} aria-hidden="true">
                        A
                      </span>
                      <span className={styles.stopName}>{originLabel}</span>
                    </div>
                    <span className={styles.pinRail} aria-hidden="true" />
                    <div className={styles.routeStop}>
                      <span className={styles.pinB} aria-hidden="true">
                        B
                      </span>
                      <span className={styles.stopName}>{destLabel}</span>
                    </div>
                  </div>

                  <div className={styles.resultActionRow}>
                    <Link href="/transport/" className={styles.resultLinkPrimary}>
                      <Car size={15} aria-hidden="true" />
                      Book private hire
                    </Link>
                    <a
                      href={googleMapsDirectionsUrl(originCoords, destCoords)}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.resultLinkSecondary}
                    >
                      <ExternalLink size={14} aria-hidden="true" />
                      Google Maps
                    </a>
                    <button
                      type="button"
                      className={styles.mapToggleButton}
                      aria-expanded={showRouteMap}
                      onClick={() => setShowRouteMap((open) => !open)}
                    >
                      <MapIcon size={14} aria-hidden="true" />
                      {showRouteMap ? "Hide map" : "View map"}
                      {showRouteMap ? (
                        <ChevronUp size={14} aria-hidden="true" />
                      ) : (
                        <ChevronDown size={14} aria-hidden="true" />
                      )}
                    </button>
                  </div>

                  {showRouteMap ? (
                    <div className={styles.mapWrap}>
                      <TripRouteOverlayMap
                        originLat={originCoords.lat}
                        originLng={originCoords.lng}
                        destinationLat={destCoords.lat}
                        destinationLng={destCoords.lng}
                        originLabel={originLabel}
                        destinationLabel={destLabel}
                      />
                    </div>
                  ) : null}
                </>
              ) : (
                <div className={styles.resultEmpty}>
                  <span className={styles.resultEmptyIcon} aria-hidden="true">
                    <RouteIcon size={24} />
                  </span>
                  <h3>Ready to measure your route</h3>
                  <p>
                    {activeRouteError ||
                      "Choose an origin and destination on the left — or tap any Quick Measure preset — to view road distance, travel time, and save it to your favorites."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: TRIP SUGGESTIONS & DESTINATIONS */}
      <section
        id="suggested-destinations"
        className={styles.section}
        aria-labelledby="destinations-heading"
      >
        <header className={styles.sectionHead}>
          <div className={styles.sectionHeadCopy}>
            <span className={styles.sectionEyebrow}>
              <Compass size={13} aria-hidden="true" />
              Trip suggestions &amp; destinations
            </span>
            <h2 id="destinations-heading" className={styles.sectionTitle}>
              Suggested Zanzibar Destinations
            </h2>
            <p className={styles.sectionLead}>
              Explore Zanzibar&apos;s favorite beaches, heritage quarters, spice
              farms, and coastal resorts — measure any destination in one tap.
            </p>
          </div>

          <div
            className={styles.filterBar}
            role="group"
            aria-label="Filter destinations by category"
          >
            {DESTINATION_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.filterChip} ${
                  destCategory === item.id ? styles.filterChipActive : ""
                }`}
                aria-pressed={destCategory === item.id}
                onClick={() => setDestCategory(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </header>

        <div className={styles.grid3}>
          {filteredDestinations.map((dest) => {
            const isFav = favoriteIds.has(dest.id);
            const destEndpoint: TripEndpoint = {
              label: `${dest.name}, ${dest.area}`,
              lat: dest.lat,
              lng: dest.lng,
            };
            const destBookingHref = buildBookingDestinationHref(
              destEndpoint,
              dest.name,
            );
            return (
              <article key={dest.id} className={styles.tripCard}>
                <div className={styles.tripCardTop}>
                  <div className={styles.badgeCluster}>
                    <span className={styles.pillBlue}>{dest.categoryLabel}</span>
                    <span className={styles.pillGold}>
                      <Star size={11} fill="currentColor" aria-hidden="true" />
                      {dest.rating.toFixed(1)} ({dest.reviews.toLocaleString("en-US")})
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`${styles.favButton} ${
                      isFav ? styles.favButtonActive : ""
                    } ${styles.favIconOnly}`}
                    aria-label={
                      isFav
                        ? `Remove ${dest.name} from favorites`
                        : `Save ${dest.name} to favorites`
                    }
                    aria-pressed={isFav}
                    onClick={() =>
                      handleToggleFavorite({
                        id: dest.id,
                        kind: "destination",
                        title: dest.name,
                        subtitle: `${dest.area} · ${dest.categoryLabel}`,
                        origin: AIRPORT_HUB,
                        destination: destEndpoint,
                        distanceKm: dest.approxFromAirportKm,
                        durationMins: dest.approxFromAirportMins,
                        rating: dest.rating,
                        href: destBookingHref,
                        savedAt: new Date().toISOString(),
                      })
                    }
                  >
                    <Heart
                      size={16}
                      fill={isFav ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <div>
                  <h3 className={styles.cardTitle}>{dest.name}</h3>
                  <p className={styles.cardSub}>
                    <MapPin
                      size={12}
                      style={{ display: "inline", marginRight: 4, verticalAlign: -1 }}
                      aria-hidden="true"
                    />
                    {dest.area}
                  </p>
                </div>

                <p className={styles.cardSub}>{dest.summary}</p>

                <div className={styles.cardStatsBar}>
                  <span className={styles.cardStatInline}>
                    <Navigation size={13} aria-hidden="true" />
                    ~{formatTripDistance(dest.approxFromAirportKm)} ·{" "}
                    {formatTripDuration(dest.approxFromAirportMins)} from Airport
                  </span>
                </div>

                <div className={styles.cardFooter}>
                  <button
                    type="button"
                    className={styles.cardActionMeasure}
                    onClick={() => measureDestination(dest)}
                  >
                    <RouteIcon size={14} aria-hidden="true" />
                    Measure route
                  </button>
                  <Link href={destBookingHref} className={styles.cardActionBook}>
                    Book transfer
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: ZANZIBAR ATTRACTIONS & PLACES */}
      <div className={styles.explorerSection}>
        <ZanzibarAttractions
          onMeasurePlace={(place) =>
            loadIntoMeasurer(AIRPORT_HUB, {
              label: `${place.name}, ${place.area}`,
              lat: place.latitude,
              lng: place.longitude,
            })
          }
        />
      </div>

      {/* SECTION 4: MOST BOOKED TRIPS */}
      <section
        id="most-booked-trips"
        className={styles.section}
        aria-labelledby="most-booked-heading"
      >
        <header className={styles.sectionHead}>
          <div className={styles.sectionHeadCopy}>
            <span className={`${styles.sectionEyebrow} ${styles.sectionEyebrowEmerald}`}>
              <Flame size={13} aria-hidden="true" />
              Traveler favorites
            </span>
            <h2 id="most-booked-heading" className={styles.sectionTitle}>
              Most Booked Trips
            </h2>
            <p className={styles.sectionLead}>
              High-demand airport transfers, ferry pickups, and day excursions
              booked most frequently across Zanzibar.
            </p>
          </div>
        </header>

        <div className={styles.grid3}>
          {mostBookedTrips.map((trip, index) => {
            const isFav = favoriteIds.has(trip.id);
            const bookingHref = buildBookingDestinationHref(
              trip.destination,
              trip.title,
            );
            return (
              <article key={trip.id} className={styles.tripCard}>
                <div className={styles.tripCardTop}>
                  <div className={styles.badgeCluster}>
                    <span className={styles.pillEmerald}>
                      <Flame size={11} aria-hidden="true" />
                      {trip.bookingCount
                        ? `${trip.bookingCount} ${trip.bookingCount === 1 ? "booking" : "bookings"}`
                        : index === 0
                          ? "#1 Most booked"
                          : trip.badge}
                    </span>
                    <span className={styles.pillGold}>
                      <Star size={11} fill="currentColor" aria-hidden="true" />
                      {trip.rating.toFixed(1)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`${styles.favButton} ${
                      isFav ? styles.favButtonActive : ""
                    } ${styles.favIconOnly}`}
                    aria-label={
                      isFav
                        ? `Remove ${trip.title} from favorites`
                        : `Save ${trip.title} to favorites`
                    }
                    aria-pressed={isFav}
                    onClick={() =>
                      handleToggleFavorite({
                        id: trip.id,
                        kind: "most_booked",
                        title: trip.title,
                        subtitle: trip.summary,
                        origin: trip.origin,
                        destination: trip.destination,
                        distanceKm: trip.distanceKm || null,
                        durationMins: trip.durationMins || null,
                        rating: trip.rating,
                        priceLabel: trip.priceHint ?? null,
                        href: bookingHref,
                        savedAt: new Date().toISOString(),
                      })
                    }
                  >
                    <Heart
                      size={16}
                      fill={isFav ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <h3 className={styles.cardTitle}>{trip.title}</h3>
                <p className={styles.cardSub}>{trip.summary}</p>

                <div className={styles.cardRouteChip}>
                  <span className={styles.cardRouteLine}>
                    <span className={styles.dotGreen} aria-hidden="true" />
                    {trip.origin.label.split(",")[0]}
                  </span>
                  <span className={styles.cardRouteLine}>
                    <span className={styles.dotNavy} aria-hidden="true" />
                    {trip.destination.label.split(",")[0]}
                  </span>
                </div>

                <div className={styles.cardStatsBar}>
                  <span className={styles.cardStatInline}>
                    <Clock size={14} aria-hidden="true" />
                    {[
                      formatTripDistance(trip.distanceKm),
                      formatTripDuration(trip.durationMins),
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Measure live"}
                  </span>
                  {trip.priceHint ? (
                    <span className={styles.cardPrice}>{trip.priceHint}</span>
                  ) : null}
                </div>

                <div className={styles.cardFooter}>
                  <button
                    type="button"
                    className={styles.cardActionMeasure}
                    onClick={() =>
                      loadIntoMeasurer(trip.origin, trip.destination)
                    }
                  >
                    <RouteIcon size={14} aria-hidden="true" />
                    Measure
                  </button>
                  <Link href={bookingHref} className={styles.cardActionBook}>
                    Book transfer
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* SECTION 5: TOP RATED TRIPS */}
      <section
        id="top-rated-trips"
        className={styles.section}
        aria-labelledby="top-rated-heading"
      >
        <header className={styles.sectionHead}>
          <div className={styles.sectionHeadCopy}>
            <span className={`${styles.sectionEyebrow} ${styles.sectionEyebrowGold}`}>
              <Award size={13} aria-hidden="true" />
              Highest traveler scores
            </span>
            <h2 id="top-rated-heading" className={styles.sectionTitle}>
              Top Rated Trips
            </h2>
            <p className={styles.sectionLead}>
              Loved for scenic coastal drives, heritage charm, and standout
              traveler reviews across Zanzibar.
            </p>
          </div>
        </header>

        <div className={styles.grid3}>
          {topRatedTrips.map((trip) => {
            const isFav = favoriteIds.has(trip.id);
            const isCompanyTrip = trip.id.startsWith("company-trip-");
            const bookingHref = buildBookingDestinationHref(
              trip.destination,
              trip.title,
            );
            return (
              <article key={trip.id} className={styles.tripCard}>
                <div className={styles.tripCardTop}>
                  <div className={styles.badgeCluster}>
                    <span className={styles.pillGold}>
                      <Star size={11} fill="currentColor" aria-hidden="true" />
                      {trip.rating.toFixed(1)} · {trip.reviews.toLocaleString("en-US")}{" "}
                      {trip.reviews === 1 ? "review" : "reviews"}
                    </span>
                  </div>
                  <button
                    type="button"
                    className={`${styles.favButton} ${
                      isFav ? styles.favButtonActive : ""
                    } ${styles.favIconOnly}`}
                    aria-label={
                      isFav
                        ? `Remove ${trip.title} from favorites`
                        : `Save ${trip.title} to favorites`
                    }
                    aria-pressed={isFav}
                    onClick={() =>
                      handleToggleFavorite({
                        id: trip.id,
                        kind: isCompanyTrip ? "company_trip" : "top_rated",
                        title: trip.title,
                        subtitle: trip.summary,
                        origin: trip.origin,
                        destination: trip.destination,
                        distanceKm: trip.distanceKm || null,
                        durationMins: trip.durationMins || null,
                        rating: trip.rating,
                        priceLabel: trip.priceHint ?? null,
                        href: bookingHref,
                        savedAt: new Date().toISOString(),
                      })
                    }
                  >
                    <Heart
                      size={16}
                      fill={isFav ? "currentColor" : "none"}
                      aria-hidden="true"
                    />
                  </button>
                </div>

                <h3 className={styles.cardTitle}>{trip.title}</h3>
                <p className={styles.cardSub}>{trip.summary}</p>

                <div className={styles.cardRouteChip}>
                  <span className={styles.cardRouteLine}>
                    <span className={styles.dotGreen} aria-hidden="true" />
                    {trip.origin.label.split(",")[0]}
                  </span>
                  <span className={styles.cardRouteLine}>
                    <span className={styles.dotNavy} aria-hidden="true" />
                    {trip.destination.label.split(",")[0]}
                  </span>
                </div>

                <div className={styles.cardStatsBar}>
                  <span className={styles.cardStatInline}>
                    <Clock size={14} aria-hidden="true" />
                    {[
                      formatTripDistance(trip.distanceKm),
                      formatTripDuration(trip.durationMins),
                    ]
                      .filter(Boolean)
                      .join(" · ") || "Measure live"}
                  </span>
                  {trip.priceHint ? (
                    <span className={styles.cardPrice}>{trip.priceHint}</span>
                  ) : null}
                </div>

                <div className={styles.cardFooter}>
                  <button
                    type="button"
                    className={styles.cardActionMeasure}
                    onClick={() =>
                      loadIntoMeasurer(trip.origin, trip.destination)
                    }
                  >
                    <RouteIcon size={14} aria-hidden="true" />
                    Measure
                  </button>
                  <Link href={bookingHref} className={styles.cardActionBook}>
                    Book trip
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* SECTION 6: MY FAVORITE TRIPS */}
      <section
        id="favorite-trips"
        className={styles.section}
        aria-labelledby="favorite-trips-heading"
      >
        <header className={styles.sectionHead}>
          <div className={styles.sectionHeadCopy}>
            <span className={`${styles.sectionEyebrow} ${styles.sectionEyebrowRose}`}>
              <Heart size={13} fill="currentColor" aria-hidden="true" />
              Saved shortlist
            </span>
            <div className={styles.sectionTitleRow}>
              <h2 id="favorite-trips-heading" className={styles.sectionTitle}>
                My Favorite Trips
              </h2>
              <span className={`${styles.countPill} ${styles.countPillRose}`}>
                {favorites.length} saved
              </span>
            </div>
            <p className={styles.sectionLead}>
              Your favorited destinations, routes, company trips, and custom
              measured journeys stay saved right here for easy comparison.
            </p>
          </div>

          {favorites.length > 0 ? (
            <button
              type="button"
              className={styles.clearFavButton}
              onClick={clearAllFavorites}
            >
              <Trash2 size={14} aria-hidden="true" /> Clear all
            </button>
          ) : null}
        </header>

        {favorites.length === 0 ? (
          <div className={`${styles.emptyBox} ${styles.emptyBoxRose}`}>
            <span className={`${styles.emptyIcon} ${styles.emptyIconRose}`} aria-hidden="true">
              <Heart size={22} />
            </span>
            <h3>No favorite trips saved yet</h3>
            <p>
              Tap the heart icon on any destination, top-rated route, most-booked
              transfer, posted company trip, or custom measured route to save it
              here.
            </p>
          </div>
        ) : (
          <div className={styles.grid3}>
            {favorites.map((fav) => (
              <article key={fav.id} className={styles.tripCard}>
                <div className={styles.tripCardTop}>
                  <div className={styles.badgeCluster}>
                    <span className={styles.pillRose}>
                      {favoriteKindLabel(fav.kind)}
                    </span>
                    {fav.rating ? (
                      <span className={styles.pillGold}>
                        <Star size={11} fill="currentColor" aria-hidden="true" />
                        {fav.rating.toFixed(1)}
                      </span>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    className={`${styles.favButton} ${styles.favButtonActive} ${styles.favIconOnly}`}
                    aria-label={`Remove ${fav.title} from favorites`}
                    aria-pressed
                    onClick={() => handleToggleFavorite(fav)}
                  >
                    <Heart size={16} fill="currentColor" aria-hidden="true" />
                  </button>
                </div>

                <h3 className={styles.cardTitle}>{fav.title}</h3>
                {fav.subtitle ? (
                  <p className={styles.cardSub}>{fav.subtitle}</p>
                ) : null}

                {fav.origin && fav.destination ? (
                  <div className={styles.cardRouteChip}>
                    <span className={styles.cardRouteLine}>
                      <span className={styles.dotGreen} aria-hidden="true" />
                      {fav.origin.label.split(",")[0]}
                    </span>
                    <span className={styles.cardRouteLine}>
                      <span className={styles.dotNavy} aria-hidden="true" />
                      {fav.destination.label.split(",")[0]}
                    </span>
                  </div>
                ) : null}

                {fav.distanceKm || fav.durationMins || fav.priceLabel ? (
                  <div className={styles.cardStatsBar}>
                    <span className={styles.cardStatInline}>
                      <Clock size={14} aria-hidden="true" />
                      {[
                        formatTripDistance(fav.distanceKm),
                        formatTripDuration(fav.durationMins),
                      ]
                        .filter(Boolean)
                        .join(" · ") || "Saved trip"}
                    </span>
                    {fav.priceLabel ? (
                      <span className={styles.cardPrice}>{fav.priceLabel}</span>
                    ) : null}
                  </div>
                ) : null}

                <div className={styles.cardFooter}>
                  {fav.origin && fav.destination ? (
                    <button
                      type="button"
                      className={styles.cardActionMeasure}
                      onClick={() =>
                        loadIntoMeasurer(fav.origin!, fav.destination!)
                      }
                    >
                      <RouteIcon size={14} aria-hidden="true" />
                      Measure
                    </button>
                  ) : null}
                  <Link
                    href={buildBookingDestinationHref(
                      fav.destination,
                      fav.title,
                    )}
                    className={styles.cardActionBook}
                  >
                    Book trip
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      {/* SECTION 7: COMPANY POSTED TRIPS */}
      <section
        id="posted-trips"
        className={styles.section}
        aria-labelledby="posted-trips-heading"
      >
        <header className={styles.sectionHead}>
          <div className={styles.sectionHeadCopy}>
            <span className={styles.sectionEyebrow}>
              <Car size={13} aria-hidden="true" />
              Verified travel companies
            </span>
            <div className={styles.sectionTitleRow}>
              <h2 id="posted-trips-heading" className={styles.sectionTitle}>
                Posted Company Trips
              </h2>
              {!loadingTrips ? (
                <span className={styles.countPill}>
                  {filteredPostedTrips.length}{" "}
                  {filteredPostedTrips.length === 1 ? "trip" : "trips"}
                </span>
              ) : null}
            </div>
            <p className={styles.sectionLead}>
              Fixed-route trips published directly by approved travel companies
              across Zanzibar.
            </p>
          </div>

          <div className={styles.postedToolbar}>
            <div className={styles.searchWrap}>
              <Search size={15} className={styles.searchIcon} aria-hidden="true" />
              <input
                type="search"
                className={styles.searchInput}
                placeholder="Search company trips or places…"
                aria-label="Search posted trips"
                value={postedSearch}
                onChange={(event) => setPostedSearch(event.target.value)}
              />
            </div>

            <select
              className={styles.sortSelect}
              aria-label="Sort posted trips"
              value={postedSort}
              onChange={(event) =>
                setPostedSort(event.target.value as PostedSort)
              }
            >
              <option value="newest">Newest first</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="favorites">Favorites only</option>
            </select>
          </div>
        </header>

        {loadingTrips ? (
          <div className={styles.grid3} aria-busy="true">
            {[0, 1, 2].map((index) => (
              <div key={index} className={styles.skeletonCard}>
                <div className={`${styles.skeletonBlock} ${styles.skeletonImg}`} />
                <div className={styles.skeletonBlock} style={{ width: "70%" }} />
                <div className={styles.skeletonBlock} style={{ width: "45%" }} />
              </div>
            ))}
          </div>
        ) : filteredPostedTrips.length === 0 ? (
          <div className={styles.emptyBox}>
            <span className={styles.emptyIcon} aria-hidden="true">
              <Compass size={22} />
            </span>
            <h3>
              {postedSort === "favorites"
                ? "No favorited company trips yet"
                : postedSearch.trim()
                  ? "No posted trips match your search"
                  : "No company trips posted yet"}
            </h3>
            <p>
              {postedSort === "favorites"
                ? "Tap the heart button on any posted trip card to see it under your favorites filter."
                : postedSearch.trim()
                  ? "Try clearing your search term or explore our suggested destinations above."
                  : "Use the Trip Measurer above or browse private hire vehicles to plan your journey."}
            </p>
          </div>
        ) : (
          <div className={styles.grid3}>
            {filteredPostedTrips.map((trip) => {
              const favId = `company-trip-${trip.id}`;
              const isFav = favoriteIds.has(favId);
              const oLat = trip.origin_latitude ?? trip.latitude;
              const oLng = trip.origin_longitude ?? trip.longitude;
              const dLat = trip.destination_latitude;
              const dLng = trip.destination_longitude;
              const originName =
                trip.place ||
                tripPlaceNameForCoords(oLat, oLng) ||
                "Zanzibar";
              const destinationName = tripPlaceNameForCoords(dLat, dLng);
              const hasBothCoords =
                oLat != null && oLng != null && dLat != null && dLng != null;
              const journey = [
                formatTripDistance(trip.distance_km),
                formatTripDuration(trip.duration_mins),
              ]
                .filter(Boolean)
                .join(" · ");
              const companyStat = trip.company_id
                ? companyStatMap.get(trip.company_id)
                : undefined;

              return (
                <article
                  key={trip.id}
                  className={`${styles.tripCard} ${styles.companyTripCard}`}
                >
                  <div className={styles.companyTripMedia}>
                    {trip.image_url ? (
                      <Image
                        src={getImageUrl(trip.image_url)}
                        alt={trip.title}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                        className={styles.companyTripImg}
                        unoptimized={isUnoptimizableImage(getImageUrl(trip.image_url))}
                      />
                    ) : (
                      <span className={styles.companyTripMediaEmpty}>
                        <MapPin size={28} aria-hidden="true" />
                      </span>
                    )}

                    <div className={styles.companyTripOverlayTop}>
                      {trip.company_name ? (
                        <span className={styles.companyBadge}>
                          {trip.company_name}
                        </span>
                      ) : (
                        <span />
                      )}
                      <button
                        type="button"
                        className={`${styles.favButton} ${
                          isFav ? styles.favButtonActive : ""
                        } ${styles.favIconOnly}`}
                        aria-label={
                          isFav
                            ? `Remove ${trip.title} from favorites`
                            : `Save ${trip.title} to favorites`
                        }
                        aria-pressed={isFav}
                        onClick={() =>
                          handleToggleFavorite({
                            id: favId,
                            kind: "company_trip",
                            title: trip.title,
                            subtitle: trip.company_name
                              ? `Hosted by ${trip.company_name}`
                              : originName,
                            origin:
                              oLat != null && oLng != null
                                ? { label: originName, lat: oLat, lng: oLng }
                                : undefined,
                            destination:
                              dLat != null && dLng != null
                                ? {
                                    label: destinationName || "Destination",
                                    lat: dLat,
                                    lng: dLng,
                                  }
                                : undefined,
                            distanceKm: trip.distance_km ?? null,
                            durationMins: trip.duration_mins ?? null,
                            rating: companyStat?.rating || null,
                            priceLabel: trip.price ? `$${trip.price}` : null,
                            href: `/trips/${trip.id}/`,
                            savedAt: new Date().toISOString(),
                          })
                        }
                      >
                        <Heart
                          size={16}
                          fill={isFav ? "currentColor" : "none"}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </div>

                  <div className={styles.companyTripBody}>
                    {companyStat && companyStat.rating > 0 ? (
                      <div className={styles.badgeCluster}>
                        <span className={styles.pillGold}>
                          <Star size={11} fill="currentColor" aria-hidden="true" />
                          {companyStat.rating.toFixed(1)} ({companyStat.review_count})
                        </span>
                      </div>
                    ) : null}

                    <h3 className={styles.cardTitle}>{trip.title}</h3>
                    <p className={styles.cardSub}>
                      {trip.description ||
                        (trip.company_name
                          ? `Posted by ${trip.company_name}.`
                          : "Curated Zanzibar trip.")}
                    </p>

                    <div className={styles.cardRouteChip}>
                      <span className={styles.cardRouteLine}>
                        <span className={styles.dotGreen} aria-hidden="true" />
                        {originName}
                      </span>
                      {destinationName ? (
                        <span className={styles.cardRouteLine}>
                          <span className={styles.dotNavy} aria-hidden="true" />
                          {destinationName}
                        </span>
                      ) : null}
                    </div>

                    <div className={styles.cardStatsBar}>
                      <span className={styles.cardStatInline}>
                        <Clock size={14} aria-hidden="true" />
                        {journey || "Custom route"}
                      </span>
                      <span className={styles.cardPrice}>
                        {trip.price ? `$${trip.price}` : "On request"}
                      </span>
                    </div>

                    <div className={styles.cardFooter}>
                      {hasBothCoords ? (
                        <button
                          type="button"
                          className={styles.cardActionMeasure}
                          onClick={() =>
                            loadIntoMeasurer(
                              { label: originName, lat: oLat!, lng: oLng! },
                              {
                                label: destinationName || "Destination",
                                lat: dLat!,
                                lng: dLng!,
                              },
                            )
                          }
                        >
                          <RouteIcon size={14} aria-hidden="true" />
                          Measure
                        </button>
                      ) : null}
                      <Link
                        href={`/trips/${trip.id}/`}
                        className={styles.cardActionBook}
                      >
                        View trip
                        <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>
      </div>
    </div>
  );
}
