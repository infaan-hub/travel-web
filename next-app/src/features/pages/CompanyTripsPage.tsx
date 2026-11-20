"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpDown,
  Award,
  BarChart3,
  Building2,
  Car,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Compass,
  Copy,
  ExternalLink,
  LayoutDashboard,
  LoaderCircle,
  LocateFixed,
  Map as MapIcon,
  MapPin,
  MessageCircle,
  Navigation,
  Route as RouteIcon,
  Send,
  Star,
  Users,
  X,
} from "lucide-react";
import { geocodeAPI, reviewsAPI, routeAPI, tripsAPI } from "@/lib/api/client";
import {
  AIRPORT_HUB,
  CURATED_DESTINATIONS,
  CURATED_TOP_RATED_TRIPS,
  MEASURE_PRESETS,
  formatTripDistance,
  formatTripDuration,
  type CuratedDestination,
  type CuratedTripRoute,
  type TripEndpoint,
} from "@/lib/trip-discovery";
import {
  buildDriverTripWhatsAppMessage,
  buildGoogleMapsTripRouteUrl,
  buildWhatsAppDirectContactPickerUrl,
} from "@/lib/driver-trip-share";
import { tripPlaceNameForCoords } from "@/lib/trips";
import type { PlaceSuggestion } from "@/lib/place-types";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import TripRouteOverlayMap from "@/components/TripRouteOverlayMap";
import { useToast } from "@/components/ToastProvider";
import styles from "@/features/pages/driver-workspace.module.css";

export type CompanyTripHubContext = {
  id: number;
  name: string;
  contact_phone: string;
  contact_email: string;
  drivers: {
    id: number;
    name: string;
    phone: string;
    license_number: string;
    is_active: boolean;
  }[];
  vehicles: {
    id: number;
    name: string;
    plate_number: string;
    category: string;
    capacity: number;
    is_available: boolean;
  }[];
};

type PublicTripRecord = {
  id: number;
  title: string;
  description?: string;
  place?: string;
  price?: number | string | null;
  company_name?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  origin_latitude?: number | null;
  origin_longitude?: number | null;
  destination_latitude?: number | null;
  destination_longitude?: number | null;
  distance_km?: number | null;
  duration_mins?: number | null;
};

type ReviewStat = {
  trip_id?: number;
  average_rating?: number;
  review_count?: number;
};

type Props = {
  company: CompanyTripHubContext;
};

function placeLabel(place: PlaceSuggestion): string {
  return place.area ? `${place.name}, ${place.area}` : place.name;
}

export default function CompanyTripsPage({ company }: Props) {
  const toast = useToast();
  const generatorRef = useRef<HTMLElement | null>(null);
  const mapCardRef = useRef<HTMLElement | null>(null);
  const originGeocodeSeqRef = useRef(0);
  const destGeocodeSeqRef = useRef(0);

  const defaultDriver =
    company.drivers.find((d) => d.is_active) ?? company.drivers[0] ?? null;
  const defaultVehicle =
    company.vehicles.find((v) => v.is_available) ?? company.vehicles[0] ?? null;

  // Trip builder state — starts unpinned so the company freely picks any origin & destination
  const [originLabel, setOriginLabel] = useState("");
  const [originCoords, setOriginCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [destLabel, setDestLabel] = useState("");
  const [destCoords, setDestCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [selectedDriverId, setSelectedDriverId] = useState<string>(
    defaultDriver ? String(defaultDriver.id) : "custom",
  );
  const [driverName, setDriverName] = useState(defaultDriver?.name ?? company.name);
  const [driverPhone, setDriverPhone] = useState(
    defaultDriver?.phone || company.contact_phone || "",
  );
  const [driverLicense, setDriverLicense] = useState(defaultDriver?.license_number ?? "");

  const [selectedVehicleId, setSelectedVehicleId] = useState<string>(
    defaultVehicle ? String(defaultVehicle.id) : "custom",
  );
  const [vehicleName, setVehicleName] = useState(defaultVehicle?.name ?? "");
  const [vehiclePlate, setVehiclePlate] = useState(defaultVehicle?.plate_number ?? "");
  const [vehicleCategory, setVehicleCategory] = useState(
    defaultVehicle?.category ?? "Private Hire",
  );
  const [vehicleSeats, setVehicleSeats] = useState<number>(defaultVehicle?.capacity ?? 4);

  const [scheduleText, setScheduleText] = useState("");
  const [passengers, setPassengers] = useState("2");
  const [fareEstimate, setFareEstimate] = useState("");
  const [tripNotes, setTripNotes] = useState("");

  const [routeMetrics, setRouteMetrics] = useState<{
    key: string;
    distanceKm: number | null;
    durationMins: number | null;
  } | null>(null);
  const [manualGeocoding, setManualGeocoding] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showMap, setShowMap] = useState(true);
  const [copied, setCopied] = useState(false);

  const routeCoordsKey =
    originCoords && destCoords
      ? `${originCoords.lat},${originCoords.lng}->${destCoords.lat},${destCoords.lng}`
      : null;
  const activeRouteMetrics =
    routeCoordsKey && routeMetrics?.key === routeCoordsKey ? routeMetrics : null;
  const routeDistanceKm = activeRouteMetrics?.distanceKm ?? null;
  const routeDurationMins = activeRouteMetrics?.durationMins ?? null;
  const calculating =
    manualGeocoding || Boolean(routeCoordsKey && routeMetrics?.key !== routeCoordsKey);

  // Discovery lists
  const [companyTrips, setCompanyTrips] = useState<PublicTripRecord[]>([]);
  const [reviewStats, setReviewStats] = useState<ReviewStat[]>([]);

  useEffect(() => {
    let active = true;
    Promise.all([
      tripsAPI.getAll().catch(() => ({ data: [] })),
      reviewsAPI.getStats().catch(() => ({ data: [] })),
    ]).then(([tripsRes, statsRes]) => {
      if (!active) return;
      const tData = tripsRes.data;
      setCompanyTrips(Array.isArray(tData) ? tData : tData?.results ?? []);
      const sData = statsRes.data;
      setReviewStats(Array.isArray(sData) ? sData : sData?.results ?? []);
    });
    return () => {
      active = false;
    };
  }, []);

  // Automatically calculate road distance & duration whenever both coordinates are ready
  useEffect(() => {
    if (!originCoords || !destCoords || !routeCoordsKey) return;
    let active = true;
    routeAPI
      .calculate({
        origin_lat: originCoords.lat,
        origin_lng: originCoords.lng,
        destination_lat: destCoords.lat,
        destination_lng: destCoords.lng,
      })
      .then((res) => {
        if (!active) return;
        const dist = Number(res.data?.distance_km);
        const dur = Number(res.data?.duration_mins ?? res.data?.estimated_time_mins);
        setRouteMetrics({
          key: routeCoordsKey,
          distanceKm: Number.isFinite(dist) ? dist : null,
          durationMins: Number.isFinite(dur) ? dur : null,
        });
      })
      .catch(() => {
        if (!active) return;
        setRouteMetrics({
          key: routeCoordsKey,
          distanceKm: null,
          durationMins: null,
        });
      });
    return () => {
      active = false;
    };
  }, [destCoords, originCoords, routeCoordsKey]);

  const resolveCustomEndpoint = useCallback(
    async (target: "origin" | "destination", query: string) => {
      const trimmed = query.trim();
      if (trimmed.length < 2) return;
      const seqRef = target === "origin" ? originGeocodeSeqRef : destGeocodeSeqRef;
      const seq = ++seqRef.current;
      try {
        const res = await geocodeAPI.search(trimmed);
        if (seqRef.current !== seq) return;
        const lat = Number(res.data?.lat);
        const lng = Number(res.data?.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          if (target === "origin") {
            setOriginCoords({ lat, lng });
          } else {
            setDestCoords({ lat, lng });
          }
        }
      } catch {
        // Keep text value; company can still generate or send via WhatsApp.
      }
    },
    [],
  );

  const handleDriverSelect = (val: string) => {
    setSelectedDriverId(val);
    if (val === "custom") {
      setDriverLicense("");
      return;
    }
    const found = company.drivers.find((d) => String(d.id) === val);
    if (found) {
      setDriverName(found.name);
      setDriverPhone(found.phone || company.contact_phone || "");
      setDriverLicense(found.license_number);
    }
  };

  const handleVehicleSelect = (val: string) => {
    setSelectedVehicleId(val);
    if (val === "custom") return;
    const found = company.vehicles.find((v) => String(v.id) === val);
    if (found) {
      setVehicleName(found.name);
      setVehiclePlate(found.plate_number);
      setVehicleCategory(found.category);
      setVehicleSeats(found.capacity);
    }
  };

  const handleUseCurrentGps = () => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) {
      toast.error("GPS location is not available on this device.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(6));
        const lng = Number(pos.coords.longitude.toFixed(6));
        let label = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        try {
          const rev = await geocodeAPI.reverse(lat, lng);
          if (rev.data?.display_name) {
            label = String(rev.data.display_name).trim().slice(0, 140);
          }
        } catch {
          // Keep coordinate label
        }
        originGeocodeSeqRef.current += 1;
        setOriginLabel(label);
        setOriginCoords({ lat, lng });
        setShowMap(true);
        setLocating(false);
      },
      () => {
        setLocating(false);
        toast.error("Could not detect current GPS location.");
      },
      { enableHighAccuracy: true, timeout: 12_000 },
    );
  };

  const handleSwap = () => {
    originGeocodeSeqRef.current += 1;
    destGeocodeSeqRef.current += 1;
    setOriginLabel(destLabel);
    setDestLabel(originLabel);
    setOriginCoords(destCoords);
    setDestCoords(originCoords);
  };

  const handleClearLocations = () => {
    originGeocodeSeqRef.current += 1;
    destGeocodeSeqRef.current += 1;
    setOriginLabel("");
    setOriginCoords(null);
    setDestLabel("");
    setDestCoords(null);
    setRouteMetrics(null);
  };

  const handleGenerateManual = async () => {
    if (!originLabel.trim() || !destLabel.trim()) {
      toast.error("Choose both origin and destination first.");
      return;
    }
    setManualGeocoding(true);
    try {
      let o = originCoords;
      let d = destCoords;
      if (!o) {
        const seq = ++originGeocodeSeqRef.current;
        const r = await geocodeAPI.search(originLabel.trim());
        const lat = Number(r.data?.lat);
        const lng = Number(r.data?.lng);
        if (originGeocodeSeqRef.current === seq && Number.isFinite(lat) && Number.isFinite(lng)) {
          o = { lat, lng };
          setOriginCoords(o);
        }
      }
      if (!d) {
        const seq = ++destGeocodeSeqRef.current;
        const r = await geocodeAPI.search(destLabel.trim());
        const lat = Number(r.data?.lat);
        const lng = Number(r.data?.lng);
        if (destGeocodeSeqRef.current === seq && Number.isFinite(lat) && Number.isFinite(lng)) {
          d = { lat, lng };
          setDestCoords(d);
        }
      }
      setShowMap(true);
      mapCardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      if (!o || !d) {
        toast.success("Trip ready! You can send it via WhatsApp with Google Maps links.");
      }
    } catch {
      toast.error("Could not geocode custom place name — you can still share via WhatsApp.");
    } finally {
      setManualGeocoding(false);
    }
  };

  const loadRouteIntoGenerator = useCallback((origin: TripEndpoint, destination: TripEndpoint) => {
    originGeocodeSeqRef.current += 1;
    destGeocodeSeqRef.current += 1;
    setOriginLabel(origin.label);
    setOriginCoords({ lat: origin.lat, lng: origin.lng });
    setDestLabel(destination.label);
    setDestCoords({ lat: destination.lat, lng: destination.lng });
    setShowMap(true);
    generatorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const buildWhatsAppForRoute = useCallback(
    (
      origin: { label: string; lat?: number | null; lng?: number | null },
      destination: { label: string; lat?: number | null; lng?: number | null },
      opts?: { distanceKm?: number | null; durationMins?: number | null; fare?: string | null },
    ) => {
      const msg = buildDriverTripWhatsAppMessage({
        driverName: driverName.trim() || company.name,
        driverPhone: driverPhone.trim() || company.contact_phone || null,
        driverLicense: driverLicense.trim() || null,
        companyName: company.name,
        vehicleName: vehicleName || defaultVehicle?.name || "Private Hire Vehicle",
        vehiclePlate: vehiclePlate || defaultVehicle?.plate_number || "",
        vehicleCategory: vehicleCategory || defaultVehicle?.category || "",
        vehicleSeats,
        origin,
        destination,
        distanceKm: opts?.distanceKm ?? null,
        durationMins: opts?.durationMins ?? null,
        scheduleText: scheduleText.trim() || null,
        passengers: passengers.trim() || null,
        fareEstimate: opts?.fare ?? (fareEstimate.trim() || null),
        notes: tripNotes.trim() || null,
      });
      return { message: msg, url: buildWhatsAppDirectContactPickerUrl(msg) };
    },
    [
      company.contact_phone,
      company.name,
      defaultVehicle?.category,
      defaultVehicle?.name,
      defaultVehicle?.plate_number,
      driverLicense,
      driverName,
      driverPhone,
      fareEstimate,
      passengers,
      scheduleText,
      tripNotes,
      vehicleCategory,
      vehicleName,
      vehiclePlate,
      vehicleSeats,
    ],
  );

  const generatedWhatsApp = useMemo(() => {
    if (!originLabel.trim() || !destLabel.trim()) return null;
    return buildWhatsAppForRoute(
      { label: originLabel, lat: originCoords?.lat, lng: originCoords?.lng },
      { label: destLabel, lat: destCoords?.lat, lng: destCoords?.lng },
      { distanceKm: routeDistanceKm, durationMins: routeDurationMins },
    );
  }, [
    buildWhatsAppForRoute,
    destCoords?.lat,
    destCoords?.lng,
    destLabel,
    originCoords?.lat,
    originCoords?.lng,
    originLabel,
    routeDistanceKm,
    routeDurationMins,
  ]);

  const googleMapsUrl = useMemo(() => {
    if (!originLabel.trim() || !destLabel.trim()) return null;
    return buildGoogleMapsTripRouteUrl(
      { label: originLabel, lat: originCoords?.lat, lng: originCoords?.lng },
      { label: destLabel, lat: destCoords?.lat, lng: destCoords?.lng },
    );
  }, [
    destCoords?.lat,
    destCoords?.lng,
    destLabel,
    originCoords?.lat,
    originCoords?.lng,
    originLabel,
  ]);

  const handleCopyMessage = async () => {
    if (!generatedWhatsApp) return;
    try {
      await navigator.clipboard.writeText(generatedWhatsApp.message);
      setCopied(true);
      toast.success("Trip WhatsApp message copied to clipboard.");
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      toast.error("Could not copy message.");
    }
  };

  const topRatedTrips = useMemo<CuratedTripRoute[]>(() => {
    const statByTripId = new Map<number, { rating: number; count: number }>();
    for (const s of reviewStats) {
      if (s.trip_id != null && Number(s.average_rating ?? 0) > 0) {
        statByTripId.set(s.trip_id, {
          rating: Number(s.average_rating),
          count: Number(s.review_count ?? 1),
        });
      }
    }

    const fromCompany: CuratedTripRoute[] = companyTrips
      .map((trip) => {
        const stat = statByTripId.get(trip.id);
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
        return {
          id: `company-hub-trip-${trip.id}`,
          title: trip.title,
          badge: "Top rated",
          origin: {
            label: trip.place || tripPlaceNameForCoords(oLat, oLng) || "Origin",
            lat: oLat,
            lng: oLng,
          },
          destination: {
            label: tripPlaceNameForCoords(dLat, dLng) || "Destination",
            lat: dLat,
            lng: dLng,
          },
          distanceKm: Number(trip.distance_km ?? 0),
          durationMins: Number(trip.duration_mins ?? 0),
          rating: stat.rating,
          reviews: stat.count,
          priceHint: trip.price ? `$${trip.price}` : undefined,
          summary:
            trip.description ||
            (trip.company_name ? `Operated by ${trip.company_name}.` : "Verified Zanzibar trip."),
        } as CuratedTripRoute;
      })
      .filter((item): item is CuratedTripRoute => item !== null)
      .sort((a, b) => b.rating - a.rating || b.reviews - a.reviews);

    return [...fromCompany, ...CURATED_TOP_RATED_TRIPS].slice(0, 6);
  }, [companyTrips, reviewStats]);

  const measureDestination = (dest: CuratedDestination) => {
    const start: TripEndpoint =
      originCoords && originLabel.trim()
        ? { label: originLabel.trim(), lat: originCoords.lat, lng: originCoords.lng }
        : AIRPORT_HUB;
    loadRouteIntoGenerator(start, {
      label: `${dest.name}, ${dest.area}`,
      lat: dest.lat,
      lng: dest.lng,
    });
  };

  return (
    <main id="driver-workspace-root" className={`page ${styles.page}`}>
      <div className={styles.shell}>
        {/* TOP COMPANY WORKSPACE NAV */}
        <nav className={styles.topNav} aria-label="Company workspace navigation">
          <div className={styles.topNavTabs}>
            <Link href="/company/dashboard/" className={styles.topNavLink}>
              <LayoutDashboard size={15} aria-hidden="true" />
              Overview
            </Link>
            <Link href="/company/bookings/" className={styles.topNavLink}>
              <ClipboardList size={15} aria-hidden="true" />
              Bookings
            </Link>
            <Link
              href="/company/trips/"
              className={`${styles.topNavLink} ${styles.topNavLinkActive}`}
              aria-current="page"
            >
              <Compass size={15} aria-hidden="true" />
              Trips
            </Link>
            <Link href="/company/private-hire/" className={styles.topNavLink}>
              <Car size={15} aria-hidden="true" />
              Fleet
            </Link>
            <Link href="/company/private-driver/" className={styles.topNavLink}>
              <Users size={15} aria-hidden="true" />
              Drivers
            </Link>
            <Link href="/company/analytics/" className={styles.topNavLink}>
              <BarChart3 size={15} aria-hidden="true" />
              Insights
            </Link>
          </div>
        </nav>

        {/* EXECUTIVE HEADER */}
        <header className={styles.heroCard}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrowRow}>
              <span className={styles.eyebrow}>
                <Compass size={13} aria-hidden="true" />
                Company trip generator &amp; WhatsApp dispatch
              </span>
              <span className={styles.companyTag}>
                <Building2 size={12} aria-hidden="true" />
                {company.name}
              </span>
            </div>
            <h1 className={styles.heroTitle}>Generate &amp; Send Trips to Customers</h1>
          </div>
        </header>

        {/* ===================================================================
            CARD 1: DEDICATED CUSTOM TRIP BUILDER CARD (NO MAP OVERLAP!)
           =================================================================== */}
        <section
          ref={generatorRef}
          className={`${styles.panel} ${styles.builderCard}`}
          aria-labelledby="company-trip-generator-heading"
        >
          <header className={styles.panelHead}>
            <div className={styles.panelHeadCopy}>
              <span className={styles.eyebrow}>
                <RouteIcon size={13} aria-hidden="true" />
                Step 1 · Custom trip builder
              </span>
              <h2 id="company-trip-generator-heading" className={styles.panelTitle}>
                Generate trip &amp; send via WhatsApp
              </h2>
              <p className={styles.panelSub}>
                Choose Origin &amp; Destination to calculate the live road route and build a
                complete WhatsApp card with Google Maps directions.
              </p>
            </div>
          </header>

          {/* Quick route presets */}
          <div className={styles.presetsRow}>
            <span className={styles.presetsLabel}>Quick routes:</span>
            {MEASURE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                className={styles.presetBtn}
                onClick={() => loadRouteIntoGenerator(preset.origin, preset.destination)}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <div className={styles.builderSections}>
            {/* Group A: Origin & Destination Route */}
            <div className={styles.builderGroup}>
              <h3 className={styles.builderGroupTitle}>
                <MapPin size={15} aria-hidden="true" />
                Route locations
              </h3>

              <PlaceAutocomplete
                label="Origin (Pickup location)"
                name="company-trip-origin"
                variant="origin"
                value={originLabel}
                pinned={originCoords != null}
                pinnedLabel="Selected"
                placeholder="Select or search any origin e.g. Airport, Stone Town, Ferry…"
                onChange={(val) => {
                  originGeocodeSeqRef.current += 1;
                  setOriginLabel(val);
                  setOriginCoords(null);
                }}
                onSelect={(place) => {
                  originGeocodeSeqRef.current += 1;
                  setOriginLabel(placeLabel(place));
                  setOriginCoords({ lat: place.latitude, lng: place.longitude });
                  setShowMap(true);
                }}
                onCustomConfirm={(val) => {
                  setOriginLabel(val);
                  setOriginCoords(null);
                  void resolveCustomEndpoint("origin", val);
                }}
                action={
                  <button
                    type="button"
                    className={styles.presetBtn}
                    onClick={handleUseCurrentGps}
                    disabled={locating}
                  >
                    {locating ? (
                      <LoaderCircle size={13} className={styles.spin} aria-hidden="true" />
                    ) : (
                      <LocateFixed size={13} aria-hidden="true" />
                    )}
                    {locating ? "Locating…" : "Use GPS"}
                  </button>
                }
              />

              <div className={styles.swapRow}>
                <span className={styles.swapLine} aria-hidden="true" />
                <button
                  type="button"
                  className={styles.swapBtn}
                  onClick={handleSwap}
                  disabled={!originLabel.trim() && !destLabel.trim()}
                >
                  <ArrowUpDown size={13} aria-hidden="true" />
                  Swap origin &amp; destination
                </button>
                {originLabel.trim() || destLabel.trim() ? (
                  <button
                    type="button"
                    className={styles.swapBtn}
                    onClick={handleClearLocations}
                  >
                    <X size={13} aria-hidden="true" />
                    Clear
                  </button>
                ) : null}
                <span className={styles.swapLine} aria-hidden="true" />
              </div>

              <PlaceAutocomplete
                label="Destination (Drop-off location)"
                name="company-trip-destination"
                variant="destination"
                value={destLabel}
                pinned={destCoords != null}
                pinnedLabel="Selected"
                placeholder="Select or search any destination e.g. Nungwi, Kendwa, Paje, Jambiani…"
                onChange={(val) => {
                  destGeocodeSeqRef.current += 1;
                  setDestLabel(val);
                  setDestCoords(null);
                }}
                onSelect={(place) => {
                  destGeocodeSeqRef.current += 1;
                  setDestLabel(placeLabel(place));
                  setDestCoords({ lat: place.latitude, lng: place.longitude });
                  setShowMap(true);
                }}
                onCustomConfirm={(val) => {
                  setDestLabel(val);
                  setDestCoords(null);
                  void resolveCustomEndpoint("destination", val);
                }}
              />
            </div>

            {/* Group B: Driver, Vehicle & Customer Quote Details */}
            <div className={styles.builderGroup}>
              <h3 className={styles.builderGroupTitle}>
                <Car size={15} aria-hidden="true" />
                Driver, vehicle &amp; trip quote
              </h3>

              {company.drivers.length > 0 ? (
                <div className={styles.miniField}>
                  <label htmlFor="company-driver-select" className={styles.miniLabel}>
                    Assigned driver
                  </label>
                  <select
                    id="company-driver-select"
                    className={styles.miniSelect}
                    value={selectedDriverId}
                    onChange={(e) => handleDriverSelect(e.target.value)}
                  >
                    {company.drivers.map((d) => (
                      <option key={d.id} value={String(d.id)}>
                        {d.name}
                        {d.phone ? ` · ${d.phone}` : ""}
                      </option>
                    ))}
                    <option value="custom">Custom / Company dispatch</option>
                  </select>
                </div>
              ) : null}

              <div className={styles.formMiniGrid}>
                <div className={styles.miniField}>
                  <label htmlFor="company-driver-name" className={styles.miniLabel}>
                    Driver / contact name
                  </label>
                  <input
                    id="company-driver-name"
                    type="text"
                    className={styles.miniInput}
                    value={driverName}
                    onChange={(e) => {
                      setDriverName(e.target.value);
                      setSelectedDriverId("custom");
                    }}
                    placeholder="e.g. Driver or dispatcher name"
                  />
                </div>
                <div className={styles.miniField}>
                  <label htmlFor="company-driver-phone" className={styles.miniLabel}>
                    Phone / WhatsApp
                  </label>
                  <input
                    id="company-driver-phone"
                    type="text"
                    className={styles.miniInput}
                    value={driverPhone}
                    onChange={(e) => setDriverPhone(e.target.value)}
                    placeholder="e.g. +255 777 000 000"
                  />
                </div>
              </div>

              {company.vehicles.length > 0 ? (
                <div className={styles.miniField}>
                  <label htmlFor="company-vehicle-select" className={styles.miniLabel}>
                    Assigned vehicle
                  </label>
                  <select
                    id="company-vehicle-select"
                    className={styles.miniSelect}
                    value={selectedVehicleId}
                    onChange={(e) => handleVehicleSelect(e.target.value)}
                  >
                    {company.vehicles.map((v) => (
                      <option key={v.id} value={String(v.id)}>
                        {v.name} · {v.plate_number} ({v.capacity} seats)
                      </option>
                    ))}
                    <option value="custom">Custom / Other vehicle</option>
                  </select>
                </div>
              ) : null}

              <div className={styles.formMiniGrid}>
                <div className={styles.miniField}>
                  <label htmlFor="company-vehicle-name" className={styles.miniLabel}>
                    Vehicle model
                  </label>
                  <input
                    id="company-vehicle-name"
                    type="text"
                    className={styles.miniInput}
                    value={vehicleName}
                    onChange={(e) => {
                      setVehicleName(e.target.value);
                      setSelectedVehicleId("custom");
                    }}
                    placeholder="e.g. Toyota Alphard"
                  />
                </div>
                <div className={styles.miniField}>
                  <label htmlFor="company-vehicle-plate" className={styles.miniLabel}>
                    Plate number
                  </label>
                  <input
                    id="company-vehicle-plate"
                    type="text"
                    className={styles.miniInput}
                    value={vehiclePlate}
                    onChange={(e) => setVehiclePlate(e.target.value)}
                    placeholder="e.g. Z 441 AB"
                  />
                </div>
              </div>

              <div className={styles.formMiniGrid}>
                <div className={styles.miniField}>
                  <label htmlFor="company-trip-schedule" className={styles.miniLabel}>
                    Pickup date &amp; time (optional)
                  </label>
                  <input
                    id="company-trip-schedule"
                    type="text"
                    className={styles.miniInput}
                    value={scheduleText}
                    onChange={(e) => setScheduleText(e.target.value)}
                    placeholder="e.g. Today · 15:00"
                  />
                </div>
                <div className={styles.miniField}>
                  <label htmlFor="company-trip-fare" className={styles.miniLabel}>
                    Fare quote (optional)
                  </label>
                  <input
                    id="company-trip-fare"
                    type="text"
                    className={styles.miniInput}
                    value={fareEstimate}
                    onChange={(e) => setFareEstimate(e.target.value)}
                    placeholder="e.g. $55 or 145,000 TZS"
                  />
                </div>
              </div>

              <div className={styles.formMiniGrid}>
                <div className={styles.miniField}>
                  <label htmlFor="company-trip-pax" className={styles.miniLabel}>
                    Passengers
                  </label>
                  <input
                    id="company-trip-pax"
                    type="number"
                    min={1}
                    max={50}
                    className={styles.miniInput}
                    value={passengers}
                    onChange={(e) => setPassengers(e.target.value)}
                  />
                </div>
                <div className={styles.miniField}>
                  <label htmlFor="company-trip-notes" className={styles.miniLabel}>
                    Extra note (optional)
                  </label>
                  <input
                    id="company-trip-notes"
                    type="text"
                    className={styles.miniInput}
                    value={tripNotes}
                    onChange={(e) => setTripNotes(e.target.value)}
                    placeholder="e.g. Meet at Arrival Gate A"
                  />
                </div>
              </div>
            </div>
          </div>

          <footer className={styles.builderFooterBar}>
            <span className={styles.builderRoutePill}>
              <RouteIcon size={15} aria-hidden="true" />
              {calculating
                ? "Calculating road distance & time…"
                : routeDistanceKm
                  ? `${formatTripDistance(routeDistanceKm)} · ${formatTripDuration(routeDurationMins)}`
                  : "Pick Origin & Destination to measure"}
            </span>

            <button
              type="button"
              className={styles.btnPrimary}
              disabled={calculating || !originLabel.trim() || !destLabel.trim()}
              onClick={() => void handleGenerateManual()}
            >
              {calculating ? (
                <LoaderCircle size={16} className={styles.spin} aria-hidden="true" />
              ) : (
                <Navigation size={16} aria-hidden="true" />
              )}
              {calculating ? "Calculating route…" : "Generate trip route"}
            </button>
          </footer>
        </section>

        {/* ===================================================================
            CARD 2: SEPARATE FULL-WIDTH LIVE ROUTE MAP CARD
           =================================================================== */}
        <section
          ref={mapCardRef}
          className={`${styles.panel} ${styles.mapCard}`}
          aria-labelledby="company-route-map-heading"
        >
          <header className={styles.panelHead}>
            <div className={styles.panelHeadCopy}>
              <span className={styles.eyebrow}>
                <MapIcon size={13} aria-hidden="true" />
                Step 2 · Live route preview map
              </span>
              <h2 id="company-route-map-heading" className={styles.panelTitle}>
                {originLabel.trim() || destLabel.trim()
                  ? `${originLabel.split(",")[0] || "Select origin"} → ${destLabel.split(",")[0] || "Select destination"}`
                  : "Select Origin → Destination"}
              </h2>
              <p className={styles.panelSub}>
                Clear trip route map showing only your pickup origin, driving road line, and
                drop-off destination.
              </p>
            </div>

            <div className={styles.heroActions}>
              {googleMapsUrl ? (
                <a
                  href={googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className={styles.linkSecondary}
                >
                  <ExternalLink size={15} aria-hidden="true" />
                  Open in Google Maps
                </a>
              ) : null}
              {originCoords && destCoords ? (
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setShowMap((v) => !v)}
                >
                  <MapIcon size={15} aria-hidden="true" />
                  {showMap ? "Hide map" : "Show map"}
                </button>
              ) : null}
            </div>
          </header>

          <div className={styles.mapRouteStrip}>
            <div className={styles.routeStop}>
              <span className={styles.stopPinA} aria-hidden="true">
                A
              </span>
              <div className={styles.stopCopy}>
                <span className={styles.stopLabel}>Pickup origin</span>
                <span className={styles.stopValue}>{originLabel || "Choose origin above"}</span>
              </div>
            </div>
            <div className={styles.routeStop}>
              <span className={styles.stopPinB} aria-hidden="true">
                B
              </span>
              <div className={styles.stopCopy}>
                <span className={styles.stopLabel}>Drop-off destination</span>
                <span className={styles.stopValue}>{destLabel || "Choose destination above"}</span>
              </div>
            </div>
          </div>

          {showMap && originCoords && destCoords ? (
            <div className={styles.mapPreviewWrap}>
              <TripRouteOverlayMap
                originLat={originCoords.lat}
                originLng={originCoords.lng}
                destinationLat={destCoords.lat}
                destinationLng={destCoords.lng}
                originLabel={originLabel}
                destinationLabel={destLabel}
                routeOnly
              />
            </div>
          ) : !originCoords || !destCoords ? (
            <div className={styles.stateCard}>
              <span className={styles.stateIcon} aria-hidden="true">
                <MapPin size={26} />
              </span>
              <h3>
                {originCoords && !destCoords
                  ? "Now select a destination to display the route"
                  : !originCoords && destCoords
                    ? "Now select a pickup origin to display the route"
                    : originLabel.trim() && destLabel.trim()
                      ? "Tap Generate trip route to plot your locations"
                      : "Select an origin and destination to see the trip route"}
              </h3>
              <p>
                {originCoords && !destCoords
                  ? `Pickup origin is set to ${originLabel.split(",")[0]}. Choose any destination in Step 1 to show the road route.`
                  : !originCoords && destCoords
                    ? `Destination is set to ${destLabel.split(",")[0]}. Choose any pickup origin (or tap Use GPS) in Step 1 to show the road route.`
                    : "Choose any pickup origin first, then choose a destination in Step 1. The map will show only your origin pin, road route line, and destination pin."}
              </p>
            </div>
          ) : null}
        </section>

        {/* ===================================================================
            CARD 3: SEPARATE WHATSAPP CUSTOMER DISPATCH CARD
           =================================================================== */}
        <section
          className={`${styles.panel} ${styles.whatsappDispatchCard}`}
          aria-labelledby="company-whatsapp-card-heading"
        >
          <header className={styles.panelHead}>
            <div className={styles.panelHeadCopy}>
              <span className={styles.eyebrow}>
                <MessageCircle size={13} aria-hidden="true" />
                Step 3 · Direct WhatsApp send
              </span>
              <h2 id="company-whatsapp-card-heading" className={styles.panelTitle}>
                Send full trip card to customer on WhatsApp
              </h2>
              <p className={styles.panelSub}>
                Tapping send opens WhatsApp directly to your contact picker with your company and
                driver details, vehicle info, route estimate, and clickable Google Maps directions.
              </p>
            </div>
            <button
              type="button"
              className={styles.btnSecondary}
              disabled={!generatedWhatsApp}
              onClick={() => void handleCopyMessage()}
            >
              {copied ? (
                <Check size={15} aria-hidden="true" />
              ) : (
                <Copy size={15} aria-hidden="true" />
              )}
              {copied ? "Copied!" : "Copy message"}
            </button>
          </header>

          <div className={styles.whatsappDispatchGrid}>
            <pre className={styles.whatsappPreviewBody}>
              {generatedWhatsApp?.message ||
                "Select an origin and destination in Step 1 to compose the full customer WhatsApp message."}
            </pre>

            <div className={styles.whatsappSideBox}>
              <ul className={styles.whatsappSideList}>
                <li>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>
                    Operator: <strong>{company.name}</strong>
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>
                    Driver: <strong>{driverName.trim() || company.name}</strong>
                    {driverPhone.trim() ? ` (${driverPhone.trim()})` : ""}
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>
                    Vehicle:{" "}
                    <strong>{vehicleName || defaultVehicle?.name || "Private Hire"}</strong>
                    {vehiclePlate ? ` · ${vehiclePlate}` : ""}
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>
                    Google Maps full Origin → Destination route &amp; individual location pins
                    included
                  </span>
                </li>
                <li>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  <span>Opens WhatsApp directly to select any customer contact</span>
                </li>
              </ul>

              <div className={styles.whatsappActionsStack}>
                {generatedWhatsApp ? (
                  <a
                    href={generatedWhatsApp.url}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.whatsappPrimaryLink}
                  >
                    <Send size={16} aria-hidden="true" />
                    Send Trip via WhatsApp (Select Contact)
                  </a>
                ) : null}
                {googleMapsUrl ? (
                  <a
                    href={googleMapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className={styles.linkSecondary}
                  >
                    <ExternalLink size={15} aria-hidden="true" />
                    Preview Route in Google Maps
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </section>

        {/* SECTION 4: SUGGESTED ZANZIBAR DESTINATIONS */}
        <section className={styles.panel} aria-labelledby="company-suggested-heading">
          <header className={styles.panelHead}>
            <div className={styles.panelHeadCopy}>
              <span className={styles.eyebrow}>
                <Compass size={13} aria-hidden="true" />
                Suggested destinations
              </span>
              <h2 id="company-suggested-heading" className={styles.panelTitle}>
                Suggested Zanzibar Destinations
              </h2>
            </div>
          </header>

          <div className={styles.discoveryGrid}>
            {CURATED_DESTINATIONS.map((dest) => {
              const directWa = buildWhatsAppForRoute(
                AIRPORT_HUB,
                { label: `${dest.name}, ${dest.area}`, lat: dest.lat, lng: dest.lng },
                {
                  distanceKm: dest.approxFromAirportKm,
                  durationMins: dest.approxFromAirportMins,
                },
              );

              return (
                <article className={styles.discoveryCard} key={dest.id}>
                  <div className={styles.badgeGroup}>
                    <span className={styles.companyTag}>{dest.categoryLabel}</span>
                    <span className={`${styles.statusBadge} ${styles.statusPending}`}>
                      <Star size={11} fill="currentColor" aria-hidden="true" />
                      {dest.rating.toFixed(1)} ({dest.reviews.toLocaleString("en-US")})
                    </span>
                  </div>

                  <div>
                    <h3 className={styles.bookingTitle}>{dest.name}</h3>
                    <p
                      className={styles.panelSub}
                      style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      <MapPin size={12} aria-hidden="true" />
                      {dest.area}
                    </p>
                  </div>

                  <p className={styles.panelSub}>{dest.summary}</p>

                  <span className={styles.footerHint}>
                    <Clock3 size={13} aria-hidden="true" />~
                    {formatTripDistance(dest.approxFromAirportKm)} ·{" "}
                    {formatTripDuration(dest.approxFromAirportMins)} from Airport
                  </span>

                  <div className={styles.discoveryCardFooter}>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={() => measureDestination(dest)}
                    >
                      <RouteIcon size={14} aria-hidden="true" />
                      Generate
                    </button>
                    <a
                      href={directWa.url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.whatsappMiniLink}
                    >
                      <Send size={13} aria-hidden="true" />
                      Send WhatsApp
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* SECTION 5: TOP RATED TRIPS */}
        <section className={styles.panel} aria-labelledby="company-top-rated-heading">
          <header className={styles.panelHead}>
            <div className={styles.panelHeadCopy}>
              <span className={styles.eyebrow}>
                <Award size={13} aria-hidden="true" />
                Highest traveler scores
              </span>
              <h2 id="company-top-rated-heading" className={styles.panelTitle}>
                Top Rated Trips
              </h2>
              <p className={styles.panelSub}>
                Most loved Zanzibar routes you can instantly customize or share directly with
                customers via WhatsApp.
              </p>
            </div>
          </header>

          <div className={styles.discoveryGrid}>
            {topRatedTrips.map((trip) => {
              const directWa = buildWhatsAppForRoute(trip.origin, trip.destination, {
                distanceKm: trip.distanceKm || null,
                durationMins: trip.durationMins || null,
                fare: trip.priceHint ?? null,
              });

              return (
                <article className={styles.discoveryCard} key={trip.id}>
                  <div className={styles.badgeGroup}>
                    <span className={`${styles.statusBadge} ${styles.statusPending}`}>
                      <Star size={11} fill="currentColor" aria-hidden="true" />
                      {trip.rating.toFixed(1)} · {trip.reviews.toLocaleString("en-US")} reviews
                    </span>
                    {trip.priceHint ? (
                      <span className={`${styles.statusBadge} ${styles.statusConfirmed}`}>
                        {trip.priceHint}
                      </span>
                    ) : null}
                  </div>

                  <h3 className={styles.bookingTitle}>{trip.title}</h3>
                  <p className={styles.panelSub}>{trip.summary}</p>

                  <div className={styles.routeBox}>
                    <div className={styles.routeStop}>
                      <span className={styles.stopPinA} aria-hidden="true">
                        A
                      </span>
                      <span className={styles.stopValue}>{trip.origin.label.split(",")[0]}</span>
                    </div>
                    <div className={styles.routeStop}>
                      <span className={styles.stopPinB} aria-hidden="true">
                        B
                      </span>
                      <span className={styles.stopValue}>
                        {trip.destination.label.split(",")[0]}
                      </span>
                    </div>
                    {trip.distanceKm || trip.durationMins ? (
                      <div className={styles.routeMetaChips}>
                        <span>{formatTripDistance(trip.distanceKm)}</span>
                        <span>·</span>
                        <span>{formatTripDuration(trip.durationMins)}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.discoveryCardFooter}>
                    <button
                      type="button"
                      className={styles.btnSecondary}
                      onClick={() => loadRouteIntoGenerator(trip.origin, trip.destination)}
                    >
                      <Car size={14} aria-hidden="true" />
                      Load route
                    </button>
                    <a
                      href={directWa.url}
                      target="_blank"
                      rel="noreferrer"
                      className={styles.whatsappMiniLink}
                    >
                      <Send size={13} aria-hidden="true" />
                      Send WhatsApp
                    </a>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
