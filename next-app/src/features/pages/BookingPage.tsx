"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  Briefcase,
  CalendarDays,
  Car,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  LocateFixed,
  LogIn,
  Mail,
  MailCheck,
  Map as MapIcon,
  MapPin,
  Navigation,
  Phone,
  Route as RouteIcon,
  ShieldCheck,
  User,
  Users,
} from "lucide-react";
import {
  geocodeAPI,
  profileAPI,
  publicPrivateHireAPI,
  routeAPI,
  routePricesAPI,
  transportBookingsAPI,
} from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import { getImageUrl, isUnoptimizableImage } from "@/lib/utils/image-url";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import type { PlaceSuggestion } from "@/lib/place-types";
import { parseBookingDestinationParams } from "@/lib/trip-discovery";
import {
  formatTzs,
  formatUsd,
  getOptionPriceUsd,
  resolveRoutePriceQuote,
  TRIP_PRICING_OPTIONS,
  USD_TO_TZS_RATE,
  usdToTzs,
  type RoutePriceQuote,
  type TripPricingOption,
} from "@/lib/zanzibar-route-pricing";
import styles from "@/features/pages/booking-trip.module.css";

const TripRouteOverlayMap = dynamic(
  () => import("@/components/TripRouteOverlayMap"),
  {
    ssr: false,
    loading: () => (
      <div className={styles.mapLoading}>
        <Loader2 className={styles.spin} size={18} aria-hidden="true" />
        <span>Loading Zanzibar route mapâ€¦</span>
      </div>
    ),
  },
);

type Service = {
  id: number;
  title: string;
  description: string;
  price: string;
  pricing_type: string;
  vehicle: {
    name: string;
    category: string;
    capacity: number;
    luggage_capacity: number;
    plate_number?: string | null;
    front_image_url: string | null;
    side_image_url?: string | null;
    back_image_url?: string | null;
  } | null;
  driver: { name: string; phone?: string | null } | null;
  company: {
    name: string;
    slug: string;
    contact_phone?: string | null;
  } | null;
};

type AccountProfile = {
  full_name?: string;
  email?: string;
  phone?: string;
};

type BookingResult = {
  id: number;
  reference: string | null;
  travel_date: string;
  pickup_time: string | null;
  passengers: number;
  total_price: string | null;
  origin: string | null;
  destination: string | null;
  distance_km: number | null;
  duration_mins: number | null;
  total_price_tzs?: number | null;
  trip_option?: TripPricingOption | null;
  trip_request_id: number | null;
  trip: { id: number; status: string } | null;
  service: { title: string } | null;
};

type LocationSource = "none" | "suggestion" | "gps" | "custom";

type FormState = {
  full_name: string;
  phone: string;
  passengers: string;
  travel_date: string;
  pickup_time: string;
  origin: string;
  originLat: number | null;
  originLng: number | null;
  originSource: LocationSource;
  destination: string;
  destLat: number | null;
  destLng: number | null;
  destSource: LocationSource;
  notes: string;
};

type RouteEstimate = {
  distanceKm: number;
  durationMins: number;
  source: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const PARTITIONS = [
  { id: 1, sectionId: "partition-contact", label: "Contact", caption: "Name, phone & email" },
  { id: 2, sectionId: "partition-schedule", label: "Schedule", caption: "Passengers, date & time" },
  { id: 3, sectionId: "partition-route", label: "Trip Route", caption: "Origin & destination" },
  { id: 4, sectionId: "partition-confirm", label: "Confirm", caption: "Notes & submit" },
] as const;

function localDateIso(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatFormDate(value: string): string {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatIsoDate(value: string | null | undefined): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDuration(minutes: number | null | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return "";
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function formatDistance(km: number | null | undefined): string {
  if (km == null || !Number.isFinite(km)) return "";
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

function placeLabel(place: PlaceSuggestion): string {
  const name = place.name.trim();
  const area = place.area?.trim();
  if (area && !name.toLowerCase().includes(area.toLowerCase())) {
    return `${name}, ${area}`.slice(0, 255);
  }
  return name.slice(0, 255);
}

function extractErrorMessage(cause: unknown): string {
  const error = cause as {
    response?: {
      data?: { message?: string; errors?: Record<string, string[]> };
    };
  };
  const data = error.response?.data;
  const fieldError = data?.errors
    ? Object.values(data.errors).flat().find(Boolean)
    : undefined;
  return (
    data?.message ||
    fieldError ||
    "We could not send your request. Please check your details and try again."
  );
}

function scrollSectionIntoView(sectionId: string, force = false) {
  if (typeof window === "undefined") return;
  const element = document.getElementById(sectionId);
  if (!element) return;
  if (!force) {
    const rect = element.getBoundingClientRect();
    const alreadyComfortablyVisible =
      rect.top >= 76 && rect.top <= window.innerHeight * 0.72;
    if (alreadyComfortablyVisible) return;
  }
  element.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

type BookingPageProps = {
  /** "service" = specific company/service booking (/booking/:id); "public" = open private hire request (/booking/create). */
  mode?: "service" | "public";
};

export default function BookingPage({ mode = "service" }: BookingPageProps = {}) {
  const isPublicBooking = mode === "public";
  const params = useParams<Record<string, string>>();
  const serviceId = isPublicBooking ? undefined : params.serviceId;
  const searchParams = useSearchParams();
  const initialPrefill = useMemo(
    () => parseBookingDestinationParams(searchParams),
    [searchParams],
  );
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const router = useRouter();

  const [service, setService] = useState<Service | null>(null);
  const [loadedServiceId, setLoadedServiceId] = useState<string | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [profileResult, setProfileResult] = useState<{
    userId: number;
    profile: AccountProfile | null;
  } | null>(null);
  const [customEmail, setCustomEmail] = useState<string | null>(null);
  const [editingEmail, setEditingEmail] = useState(false);

  const [sending, setSending] = useState(false);
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [formError, setFormError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [locating, setLocating] = useState(false);
  const [showRouteMap, setShowRouteMap] = useState(false);
  const bgLocationCheckedRef = useRef(false);
  const [backgroundLocation, setBackgroundLocation] = useState<{
    lat: number;
    lng: number;
  } | null>(null);
  const [routeResult, setRouteResult] = useState<{
    key: string;
    route: RouteEstimate | null;
    error: string;
  } | null>(null);
  const [tripOption, setTripOption] = useState<TripPricingOption>("one_way");
  const [serverQuoteResult, setServerQuoteResult] = useState<{
    key: string;
    quote: RoutePriceQuote;
  } | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [destinationEditedByUser, setDestinationEditedByUser] = useState(false);

  const [form, setForm] = useState<FormState>(() => ({
    full_name: "",
    phone: "",
    passengers: "1",
    travel_date: "",
    pickup_time: "",
    origin: "",
    originLat: null,
    originLng: null,
    originSource: "none",
    destination: initialPrefill?.destination ?? "",
    destLat: initialPrefill?.destLat ?? null,
    destLng: initialPrefill?.destLng ?? null,
    destSource: initialPrefill
      ? initialPrefill.destLat != null && initialPrefill.destLng != null
        ? "suggestion"
        : "custom"
      : "none",
    notes: "",
  }));

  useEffect(() => {
    if (
      !initialPrefill ||
      (initialPrefill.destLat != null && initialPrefill.destLng != null)
    ) {
      return;
    }
    let active = true;
    const targetName = initialPrefill.destination;
    geocodeAPI
      .search(targetName)
      .then((response) => {
        if (!active) return;
        const lat = Number(response.data?.lat);
        const lng = Number(response.data?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        setForm((current) => {
          if (current.destination.trim() !== targetName || current.destLat != null) {
            return current;
          }
          return {
            ...current,
            destLat: lat,
            destLng: lng,
            destSource: "suggestion",
          };
        });
      })
      .catch(() => {
        // Pre-filled destination name stays valid even without geocoded coordinates.
      });
    return () => {
      active = false;
    };
  }, [initialPrefill]);

  const today = useMemo(() => localDateIso(), []);
  const loading = !isPublicBooking && Boolean(serviceId) && loadedServiceId !== serviceId;

  useEffect(() => {
    if (isPublicBooking || !serviceId) return;
    let active = true;
    publicPrivateHireAPI
      .getById(serviceId)
      .then((response) => {
        if (active) setService(response.data as Service);
      })
      .catch(() => {
        if (active) setService(null);
      })
      .finally(() => {
        if (active) setLoadedServiceId(serviceId);
      });
    return () => {
      active = false;
    };
  }, [isPublicBooking, serviceId]);

  useEffect(() => {
    if (!user) return;
    let active = true;
    const currentUserId = user.id;
    profileAPI
      .get()
      .then((response) => {
        if (active) {
          setProfileResult({
            userId: currentUserId,
            profile: (response.data ?? null) as AccountProfile | null,
          });
        }
      })
      .catch(() => {
        if (active) {
          setProfileResult({ userId: currentUserId, profile: null });
        }
      });
    return () => {
      active = false;
    };
  }, [user]);

  const accountProfile =
    user && profileResult?.userId === user.id ? profileResult.profile : null;
  const profileLoading = Boolean(user) && profileResult?.userId !== user?.id;

  const fetchedEmail = (
    accountProfile?.email?.trim() ||
    user?.email?.trim() ||
    ""
  ).trim();
  const effectiveEmail = customEmail !== null ? customEmail : fetchedEmail;
  const hasFetchedEmail =
    Boolean(fetchedEmail) && EMAIL_PATTERN.test(fetchedEmail);
  const showingFetchedEmailCard = hasFetchedEmail && !editingEmail;

  const savedProfileName = accountProfile?.full_name?.trim() || "";
  const savedProfilePhone = accountProfile?.phone?.trim() || "";
  const canFillFromProfile =
    Boolean(user) &&
    ((Boolean(savedProfileName) && !form.full_name.trim()) ||
      (Boolean(savedProfilePhone) && !form.phone.trim()));

  const maxPassengers = isPublicBooking
    ? 50
    : service?.vehicle?.capacity && service.vehicle.capacity > 0
      ? service.vehicle.capacity
      : 100;

  const passengersCount = Number(form.passengers);
  const fullNameValid = form.full_name.trim().length >= 2;
  const phoneValid = form.phone.replace(/\D/g, "").length >= 7;
  const emailValid = EMAIL_PATTERN.test(effectiveEmail.trim());
  const contactComplete = fullNameValid && phoneValid && emailValid;

  const passengersValid =
    Number.isInteger(passengersCount) &&
    passengersCount >= 1 &&
    passengersCount <= maxPassengers;
  const travelDateValid =
    Boolean(form.travel_date) && form.travel_date >= today;
  const travelTimeValid = TIME_PATTERN.test(form.pickup_time);
  const journeyComplete =
    passengersValid && travelDateValid && travelTimeValid;

  const sameRoute =
    form.origin.trim().length >= 2 &&
    form.destination.trim().length >= 2 &&
    form.origin.trim().toLowerCase() ===
      form.destination.trim().toLowerCase();
  const originConfirmed =
    form.origin.trim().length >= 2 && form.originSource !== "none";
  const destConfirmed =
    form.destination.trim().length >= 2 && form.destSource !== "none";
  const routeComplete = originConfirmed && destConfirmed && !sameRoute;

  const allComplete = contactComplete && journeyComplete && routeComplete;

  // Progressive partition visibility: each partition appears automatically below
  // once the prior partition is complete, and stays mounted if already started
  // so editing an earlier typo never collapses the form.
  const destinationPrefilledActive =
    Boolean(initialPrefill) &&
    !destinationEditedByUser &&
    form.destination.trim().length >= 2;

  const hasJourneyProgress = Boolean(
    form.travel_date || form.pickup_time || form.passengers !== "1",
  );
  const hasRouteProgress = Boolean(
    form.origin.trim() || (form.destination.trim() && destinationEditedByUser),
  );
  const hasNotesProgress = Boolean(form.notes.trim());

  const showSchedulePartition = contactComplete || hasJourneyProgress;
  const showRoutePartition =
    (contactComplete && journeyComplete) || hasRouteProgress;
  const showConfirmPartition =
    (contactComplete && journeyComplete && routeComplete) || hasNotesProgress;

  const visibleStepCount = showConfirmPartition
    ? 4
    : showRoutePartition
      ? 3
      : showSchedulePartition
        ? 2
        : 1;

  const currentStep = !contactComplete
    ? 1
    : !journeyComplete
      ? 2
      : !routeComplete
        ? 3
        : 4;

  const prevVisibleStepRef = useRef(1);
  useEffect(() => {
    const previous = prevVisibleStepRef.current;
    prevVisibleStepRef.current = visibleStepCount;
    if (visibleStepCount <= previous) return;

    const targetId =
      visibleStepCount === 2
        ? "partition-schedule"
        : visibleStepCount === 3
          ? "partition-route"
          : "partition-confirm";

    const delay = visibleStepCount === 2 ? 420 : 220;
    const timer = window.setTimeout(() => {
      scrollSectionIntoView(targetId, false);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [visibleStepCount]);

  // Background current-location check when Section 3 of 4 (Origin & destination)
  // opens on /booking/create/. Used on submit to notify nearby drivers only when
  // the customer is in Unguja or near a known system place.
  useEffect(() => {
    if (!isPublicBooking || !showRoutePartition || bgLocationCheckedRef.current) {
      return;
    }
    bgLocationCheckedRef.current = true;
    if (typeof navigator === "undefined" || !navigator.geolocation) return;

    let active = true;
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!active) return;
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          setBackgroundLocation({ lat, lng });
        }
      },
      () => {
        // Silent fallback: request stays public without nearby driver notification.
      },
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 120_000 },
    );
    return () => {
      active = false;
    };
  }, [isPublicBooking, showRoutePartition]);

  const { originLat, originLng, destLat, destLng } = form;
  const hasRouteCoords =
    originLat != null &&
    originLng != null &&
    destLat != null &&
    destLng != null;
  const routeKey = hasRouteCoords
    ? `${originLat},${originLng},${destLat},${destLng}`
    : null;
  const routeMatches = routeKey != null && routeResult?.key === routeKey;
  const visibleRoute = routeMatches ? routeResult.route : null;
  const visibleRouteError = routeMatches ? routeResult.error : "";
  const visibleRouteLoading = Boolean(routeKey) && !routeMatches;

  useEffect(() => {
    if (
      !routeKey ||
      originLat == null ||
      originLng == null ||
      destLat == null ||
      destLng == null
    ) {
      return;
    }

    let active = true;
    const requestKey = routeKey;

    routeAPI
      .calculate({
        origin_lat: originLat,
        origin_lng: originLng,
        destination_lat: destLat,
        destination_lng: destLng,
      })
      .then((response) => {
        if (!active) return;
        const data = response.data ?? {};
        const distance = Number(data.distance_km);
        const duration = Number(data.duration_mins ?? data.estimated_time_mins);
        setRouteResult({
          key: requestKey,
          route:
            Number.isFinite(distance) && Number.isFinite(duration)
              ? {
                  distanceKm: distance,
                  durationMins: duration,
                  source: String(data.source ?? "estimate"),
                }
              : null,
          error: "",
        });
      })
      .catch(() => {
        if (!active) return;
        setRouteResult({
          key: requestKey,
          route: null,
          error:
            "Distance lookup is temporarily unavailable. Your trip is still ready â€” the provider will confirm exact timing.",
        });
      });

    return () => {
      active = false;
    };
  }, [routeKey, originLat, originLng, destLat, destLng]);

  const quoteKey = routeComplete
    ? `${form.origin.trim().toLowerCase()}|${form.destination.trim().toLowerCase()}|${
        service?.id ?? "public"
      }|${visibleRoute?.distanceKm != null ? Math.round(visibleRoute.distanceKm) : ""}`
    : "";

  const fallbackRouteQuote = useMemo<RoutePriceQuote | null>(() => {
    if (!routeComplete) return null;
    return resolveRoutePriceQuote({
      origin: form.origin,
      destination: form.destination,
      distanceKm: visibleRoute?.distanceKm ?? null,
      fallbackServicePriceUsd:
        !isPublicBooking && service?.price != null ? Number(service.price) : null,
    });
  }, [routeComplete, form.origin, form.destination, visibleRoute?.distanceKm, isPublicBooking, service?.price]);

  useEffect(() => {
    if (!quoteKey || !routeComplete) return;
    let active = true;
    const requestKey = quoteKey;

    routePricesAPI
      .quote({
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        service_id: !isPublicBooking && service?.id ? service.id : undefined,
        distance_km: visibleRoute?.distanceKm ?? undefined,
      })
      .then((response) => {
        if (!active) return;
        const d = response.data ?? {};
        const oneWayUsd = Number(d.one_way_usd);
        const waitReturnUsd = Number(d.wait_return_usd);
        const fullDayUsd = Number(d.full_day_usd);
        if (!Number.isFinite(oneWayUsd) || !Number.isFinite(waitReturnUsd) || !Number.isFinite(fullDayUsd)) {
          return;
        }
        setServerQuoteResult({
          key: requestKey,
          quote: {
            matched: Boolean(d.matched),
            source: d.source || "standard",
            matchedLabel: String(d.matched_label || `${form.origin} – ${form.destination}`),
            origin: String(d.origin || form.origin),
            destination: String(d.destination || form.destination),
            exchangeRate: Number(d.exchange_rate) || USD_TO_TZS_RATE,
            oneWayUsd,
            waitReturnUsd,
            fullDayUsd,
            oneWayTzs: Number(d.one_way_tzs) || usdToTzs(oneWayUsd),
            waitReturnTzs: Number(d.wait_return_tzs) || usdToTzs(waitReturnUsd),
            fullDayTzs: Number(d.full_day_tzs) || usdToTzs(fullDayUsd),
          },
        });
      })
      .catch(() => {
        // Keep instant local fallbackRouteQuote cleanly when quote lookup fails.
      });

    return () => {
      active = false;
    };
  }, [quoteKey, routeComplete, form.origin, form.destination, isPublicBooking, service?.id, visibleRoute?.distanceKm]);

  const activeRouteQuote =
    quoteKey && serverQuoteResult?.key === quoteKey
      ? serverQuoteResult.quote
      : fallbackRouteQuote;
  const selectedFareUsd = activeRouteQuote
    ? getOptionPriceUsd(activeRouteQuote, tripOption)
    : null;
  const selectedFareTzs = selectedFareUsd != null ? usdToTzs(selectedFareUsd) : null;
  const selectedOptionMeta =
    TRIP_PRICING_OPTIONS.find((opt) => opt.key === tripOption) ?? TRIP_PRICING_OPTIONS[0];

  const touch = useCallback((field: string) => {
    setTouched((current) =>
      current[field] ? current : { ...current, [field]: true },
    );
  }, []);

  const errors = {
    full_name:
      touched.full_name && !fullNameValid ? "Enter your full name." : "",
    phone:
      touched.phone && !phoneValid
        ? "Enter a phone number with at least 7 digits."
        : "",
    email:
      touched.email && !emailValid ? "Enter a valid email address." : "",
    passengers:
      touched.passengers && !passengersValid
        ? `Choose between 1 and ${maxPassengers} passengers.`
        : "",
    travel_date:
      touched.travel_date && !travelDateValid
        ? form.travel_date
          ? "Choose today or a future date."
          : "Choose your travel date."
        : "",
    pickup_time:
      touched.pickup_time && !travelTimeValid
        ? "Choose your travel time."
        : "",
    origin:
      touched.origin && form.origin.trim().length < 2
        ? "Choose or enter a pickup location."
        : "",
    destination:
      touched.destination && form.destination.trim().length < 2
        ? "Choose or enter a destination."
        : sameRoute
          ? "Destination must be different from your pickup location."
          : "",
  };

  const providerName = isPublicBooking
    ? "Available drivers"
    : service?.company?.name?.trim() || "The provider";
  const driverName = isPublicBooking
    ? "Assigned on confirmation"
    : service?.driver?.name?.trim() || "Assigned driver";
  const bookingSearch = searchParams.toString();
  const bookingBasePath = isPublicBooking
    ? "/booking/create/"
    : `/booking/${serviceId ?? ""}/`;
  const loginReturnUrl = `/login/?from=${encodeURIComponent(
    `${bookingBasePath}${bookingSearch ? `?${bookingSearch}` : ""}`,
  )}`;

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function fillFromProfile() {
    setForm((current) => ({
      ...current,
      full_name: current.full_name.trim() || savedProfileName,
      phone: current.phone.trim() || savedProfilePhone,
    }));
  }

  function tryGeocodeCustomPlace(target: "origin" | "destination", text: string) {
    const cleaned = text.trim();
    if (cleaned.length < 3) return;
    geocodeAPI
      .search(cleaned)
      .then((response) => {
        const lat = Number(response.data?.lat);
        const lng = Number(response.data?.lng);
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;
        setForm((current) => {
          if (target === "origin") {
            if (current.origin.trim() !== cleaned || current.originLat != null) {
              return current;
            }
            return { ...current, originLat: lat, originLng: lng };
          }
          if (current.destination.trim() !== cleaned || current.destLat != null) {
            return current;
          }
          return { ...current, destLat: lat, destLng: lng };
        });
      })
      .catch(() => {
        // Custom location remains valid even when forward geocoding has no match.
      });
  }

  function confirmCustomLocation(target: "origin" | "destination", text: string) {
    const cleaned = text.trim().slice(0, 255);
    if (cleaned.length < 2) return;
    if (target === "origin") {
      setForm((current) => ({
        ...current,
        origin: cleaned,
        originLat: null,
        originLng: null,
        originSource: "custom",
      }));
    } else {
      setForm((current) => ({
        ...current,
        destination: cleaned,
        destLat: null,
        destLng: null,
        destSource: "custom",
      }));
    }
    tryGeocodeCustomPlace(target, cleaned);
  }

  function handlePlaceBlur(target: "origin" | "destination") {
    touch(target);
    if (target === "origin") {
      if (form.origin.trim().length >= 2 && form.originSource === "none") {
        setForm((current) =>
          current.origin.trim().length >= 2 && current.originSource === "none"
            ? { ...current, originSource: "custom" }
            : current,
        );
        tryGeocodeCustomPlace("origin", form.origin);
      }
    } else if (
      form.destination.trim().length >= 2 &&
      form.destSource === "none"
    ) {
      setForm((current) =>
        current.destination.trim().length >= 2 && current.destSource === "none"
          ? { ...current, destSource: "custom" }
          : current,
      );
      tryGeocodeCustomPlace("destination", form.destination);
    }
  }

  function useCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError(
        "Your browser does not support location access. Search for your pickup location instead.",
      );
      return;
    }

    setLocating(true);
    setLocationError("");

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
            const data = (await response.json()) as {
              display_name?: unknown;
            };
            if (
              typeof data.display_name === "string" &&
              data.display_name.trim()
            ) {
              label = data.display_name.trim().slice(0, 255);
            }
          }
        } catch {
          // Keep the coordinate label when reverse geocoding is unavailable.
        }

        setBackgroundLocation({ lat, lng });
        setForm((current) => ({
          ...current,
          origin: label,
          originLat: lat,
          originLng: lng,
          originSource: "gps",
        }));
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Location access was denied. Choose a suggested pickup location or type your address."
            : "We could not detect your current location. Choose a suggested pickup location instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  function swapRoute() {
    setDestinationEditedByUser(true);
    setForm((current) => ({
      ...current,
      origin: current.destination,
      originLat: current.destLat,
      originLng: current.destLng,
      originSource: current.destSource,
      destination: current.origin,
      destLat: current.originLat,
      destLng: current.originLng,
      destSource: current.originSource,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isPublicBooking && !service) return;

    setTouched({
      full_name: true,
      phone: true,
      email: true,
      passengers: true,
      travel_date: true,
      pickup_time: true,
      origin: true,
      destination: true,
    });

    if (!allComplete) {
      const targetSection = !contactComplete
        ? "partition-contact"
        : !journeyComplete
          ? "partition-schedule"
          : "partition-route";
      setFormError(
        "Please complete all required fields in the highlighted section before submitting.",
      );
      scrollSectionIntoView(targetSection, true);
      return;
    }

    setSending(true);
    setFormError("");

    try {
      const response = await transportBookingsAPI.create({
        ...(isPublicBooking
          ? {
              is_public: true,
              customer_lat: backgroundLocation?.lat,
              customer_lng: backgroundLocation?.lng,
            }
          : { service_id: service!.id }),
        full_name: form.full_name.trim(),
        email: effectiveEmail.trim(),
        phone: form.phone.trim(),
        passengers: Number(form.passengers),
        travel_date: form.travel_date,
        pickup_time: form.pickup_time,
        notes: form.notes.trim() || undefined,
        origin: form.origin.trim(),
        destination: form.destination.trim(),
        origin_lat: form.originLat ?? undefined,
        origin_lng: form.originLng ?? undefined,
        dest_lat: form.destLat ?? undefined,
        dest_lng: form.destLng ?? undefined,
        distance_km: visibleRoute?.distanceKm ?? undefined,
        duration_mins: visibleRoute?.durationMins ?? undefined,
        trip_option: tripOption,
      });
      setBooking(response.data as BookingResult);
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch (cause) {
      setFormError(extractErrorMessage(cause));
    } finally {
      setSending(false);
    }
  }

  if (!authLoading && !isAuthenticated) {
    return (
      <div id="booking-trip-root" className={`page ${styles.page}`}>
        <div className={styles.stateCard}>
          <span className={styles.stateIcon}>
            <Car size={26} aria-hidden="true" />
          </span>
          <h1 className={styles.stateTitle}>Sign in to book</h1>
          <p className={styles.stateText}>
            You need to be signed in to request a private hire trip. Please log
            in or create an account, then return to this page to complete your
            booking.
          </p>
          <Link href={loginReturnUrl} className={styles.stateLink}>
            Sign in
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div id="booking-trip-root" className={`page ${styles.page}`}>
        <div className={styles.stateCard} role="status" aria-live="polite">
          <span className={styles.stateIcon}>
            <Loader2 className={styles.spin} size={26} aria-hidden="true" />
          </span>
          <h1 className={styles.stateTitle}>Loading private hire service…</h1>
          <p className={styles.stateText}>
            Preparing your vehicle details and trip booking form.
          </p>
        </div>
      </div>
    );
  }

  if (!isPublicBooking && !service) {
    return (
      <div id="booking-trip-root" className={`page ${styles.page}`}>
        <div className={styles.stateCard}>
          <span className={styles.stateIcon}>
            <Car size={26} aria-hidden="true" />
          </span>
          <h1 className={styles.stateTitle}>Service unavailable</h1>
          <p className={styles.stateText}>
            This private hire service is no longer available. Browse the
            directory to choose another verified vehicle.
          </p>
          <Link href="/transport/" className={styles.stateLink}>
            Browse private hire services
          </Link>
        </div>
      </div>
    );
  }

  if (booking) {
    const tripId = booking.trip?.id ?? booking.trip_request_id;
    return (
      <div id="booking-trip-root" className={`page ${styles.page}`}>
        <div className={styles.successWrap}>
          <div className={styles.successCard}>
            <span className={styles.successIcon}>
              <CheckCircle2 size={34} aria-hidden="true" />
            </span>
            <span className={styles.successEyebrow}>Trip created &amp; request sent</span>
            <h1 className={styles.successTitle}>
              Your private hire trip is on its way
            </h1>
            <p className={styles.successLead}>
              {isPublicBooking
                ? "We generated your private hire request and shared it with available drivers. Once a driver confirms, you will receive your driver, vehicle, and pickup details."
                : `We generated your trip and sent it to ${providerName}. They will review availability and confirm your pickup details and final fare.`}
            </p>

            <div className={styles.referenceRow}>
              <div className={styles.referenceBox}>
                <span className={styles.referenceLabel}>Booking reference</span>
                <strong className={styles.referenceValue}>
                  {booking.reference ?? `#${booking.id}`}
                </strong>
              </div>
              {tripId ? (
                <div className={styles.referenceBox}>
                  <span className={styles.referenceLabel}>Linked Trip ID</span>
                  <strong className={styles.referenceValue}>TRIP-{tripId}</strong>
                </div>
              ) : null}
            </div>

            <dl className={styles.successSummary}>
              <div className={styles.successSummaryRow}>
                <dt className={styles.successSummaryLabel}>Trip route</dt>
                <dd className={styles.successSummaryValue}>
                  {booking.origin || form.origin} →{" "}
                  {booking.destination || form.destination}
                </dd>
              </div>
              <div className={styles.successSummaryRow}>
                <dt className={styles.successSummaryLabel}>Travel date &amp; time</dt>
                <dd className={styles.successSummaryValue}>
                  {formatIsoDate(booking.travel_date) ||
                    formatFormDate(form.travel_date)}
                  {booking.pickup_time ? ` at ${booking.pickup_time}` : ""}
                </dd>
              </div>
              <div className={styles.successSummaryRow}>
                <dt className={styles.successSummaryLabel}>Passengers</dt>
                <dd className={styles.successSummaryValue}>
                  {booking.passengers}
                </dd>
              </div>
              <div className={styles.successSummaryRow}>
                <dt className={styles.successSummaryLabel}>
                  {isPublicBooking ? "Request type" : "Vehicle"}
                </dt>
                <dd className={styles.successSummaryValue}>
                  {isPublicBooking
                    ? "Private hire request"
                    : `${service?.vehicle?.name || service?.title || "Private hire"}${
                        service?.vehicle?.plate_number
                          ? ` · ${service.vehicle.plate_number}`
                          : ""
                      }`}
                </dd>
              </div>
              {booking.distance_km != null || booking.duration_mins != null ? (
                <div className={styles.successSummaryRow}>
                  <dt className={styles.successSummaryLabel}>Estimated journey</dt>
                  <dd className={styles.successSummaryValue}>
                    {[
                      formatDistance(booking.distance_km),
                      formatDuration(booking.duration_mins),
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </dd>
                </div>
              ) : null}
              {booking.total_price != null ? (
                <div className={styles.successSummaryRow}>
                  <dt className={styles.successSummaryLabel}>Estimated fare</dt>
                  <dd className={styles.successSummaryValue}>
                    {formatUsd(Number(booking.total_price))} ·{" "}
                    {formatTzs(
                      booking.total_price_tzs ?? usdToTzs(Number(booking.total_price)),
                    )}{" "}
                    ({selectedOptionMeta.label})
                  </dd>
                </div>
              ) : null}
              {!isPublicBooking ? (
                <div className={styles.successSummaryRow}>
                  <dt className={styles.successSummaryLabel}>Provider</dt>
                  <dd className={styles.successSummaryValue}>{providerName}</dd>
                </div>
              ) : null}
            </dl>

            <div className={styles.nextSteps}>
              <div className={styles.nextStep}>
                <span className={styles.nextStepNumber}>1</span>
                <strong>{isPublicBooking ? "Driver review" : "Provider review"}</strong>
                <p>
                  {isPublicBooking
                    ? "Approved private hire drivers review your trip route, schedule, and passenger count."
                    : `${providerName} verifies vehicle availability for your trip date and route.`}
                </p>
              </div>
              <div className={styles.nextStep}>
                <span className={styles.nextStepNumber}>2</span>
                <strong>Confirmation</strong>
                <p>
                  You receive confirmed pickup details and driver info at{" "}
                  {effectiveEmail}.
                </p>
              </div>
              <div className={styles.nextStep}>
                <span className={styles.nextStepNumber}>3</span>
                <strong>Enjoy your trip</strong>
                <p>Meet your driver at your selected pickup point.</p>
              </div>
            </div>

            <div className={styles.successActions}>
              <Link href="/my-transport/" className={styles.primaryLink}>
                Track my trips
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
              <Link href="/transport/" className={styles.secondaryLink}>
                Browse more services
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const heroPhotos = service?.vehicle
    ? [
        { label: "Front", url: service.vehicle.front_image_url },
        { label: "Side", url: service.vehicle.side_image_url ?? null },
        { label: "Back", url: service.vehicle.back_image_url ?? null },
      ].filter((photo): photo is { label: string; url: string } => Boolean(photo.url))
    : [];
  const activeHeroPhoto = heroPhotos[activePhotoIndex] ?? heroPhotos[0] ?? null;

  return (
    <div id="booking-trip-root" className={`page ${styles.page}`}>
      <header className={styles.hero}>
        <div className={styles.heroMedia} aria-hidden="true">
          {activeHeroPhoto ? (
            <Image
              src={getImageUrl(activeHeroPhoto.url)}
              alt=""
              fill
              sizes="(max-width: 768px) 96vw, 1180px"
              className={styles.heroImage}
              priority
              unoptimized={isUnoptimizableImage(getImageUrl(activeHeroPhoto.url))}
            />
          ) : (
            <div className={styles.heroMediaFallback}>
              <Car size={54} />
            </div>
          )}
        </div>
        <span className={styles.heroTopScrim} aria-hidden="true" />

        <div className={styles.heroTopBar}>
          <Link href="/transport/" className={styles.backLink}>
            <ArrowLeft size={15} aria-hidden="true" />
            All private hire services
          </Link>
          {service ? (
            <Link
              href={`/transport/service/${service.id}/`}
              className={styles.backLink}
            >
              View vehicle details
            </Link>
          ) : null}
        </div>

        <div className={styles.heroSheet}>
          <div className={styles.heroBody}>
            <div className={styles.heroCopy}>
              <span className={styles.heroKicker}>
                {isPublicBooking
                  ? "Private Hire Request · Zanzibar"
                  : service?.company?.name
                    ? `${service.company.name} · Private Hire`
                    : "Verified Private Hire"}
              </span>
              <h1 className={styles.heroTitle}>
                {isPublicBooking
                  ? "Request Private Hire Transport"
                  : service?.title || "Private Hire Request"}
              </h1>
            </div>

            {!isPublicBooking && heroPhotos.length > 1 ? (
              <div
                className={styles.heroAnglePills}
                role="tablist"
                aria-label="Vehicle photo angle"
              >
                {heroPhotos.map((photo, index) => (
                  <button
                    key={photo.label}
                    type="button"
                    role="tab"
                    aria-selected={index === activePhotoIndex}
                    className={`${styles.heroAngleBtn} ${
                      index === activePhotoIndex ? styles.heroAngleBtnActive : ""
                    }`}
                    onClick={() => setActivePhotoIndex(index)}
                  >
                    {photo.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>

          <div className={styles.heroBottomRow}>
            <ul className={styles.heroFacts}>
              {isPublicBooking ? (
                <>
                  <li>
                    <Car size={14} aria-hidden="true" />
                    <span>Private hire request</span>
                  </li>
                  <li>
                    <Users size={14} aria-hidden="true" />
                    <span>Up to {maxPassengers} passengers</span>
                  </li>
                  <li>
                    <ShieldCheck size={14} aria-hidden="true" />
                    <span>Verified local drivers</span>
                  </li>
                  <li>
                    <CheckCircle2 size={14} aria-hidden="true" />
                    <span>No payment now</span>
                  </li>
                </>
              ) : (
                <>
                  {service?.vehicle ? (
                    <li>
                      <Car size={14} aria-hidden="true" />
                      <span>{service.vehicle.name}</span>
                      {service.vehicle.plate_number ? (
                        <em>{service.vehicle.plate_number}</em>
                      ) : null}
                    </li>
                  ) : null}
                  {service?.vehicle ? (
                    <li>
                      <Users size={14} aria-hidden="true" />
                      <span>Up to {service.vehicle.capacity} passengers</span>
                    </li>
                  ) : null}
                  {service?.vehicle ? (
                    <li>
                      <Briefcase size={14} aria-hidden="true" />
                      <span>{service.vehicle.luggage_capacity} luggage bags</span>
                    </li>
                  ) : null}
                  <li>
                    <ShieldCheck size={14} aria-hidden="true" />
                    <span>Verified driver</span>
                  </li>
                </>
              )}
            </ul>
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <main className={styles.main}>
          <nav aria-label="Booking sections">
            <ol className={styles.progress}>
              {PARTITIONS.map((step) => {
                const done =
                  (step.id === 1 && contactComplete) ||
                  (step.id === 2 && contactComplete && journeyComplete) ||
                  (step.id === 3 &&
                    contactComplete &&
                    journeyComplete &&
                    routeComplete);
                const unlocked = step.id <= visibleStepCount;
                const active = currentStep === step.id;

                return (
                  <li
                    key={step.id}
                    className={`${styles.progressStep} ${
                      done ? styles.progressStepDone : ""
                    } ${active ? styles.progressStepActive : ""} ${
                      !unlocked ? styles.progressStepLocked : ""
                    }`}
                    aria-current={active ? "step" : undefined}
                  >
                    <button
                      type="button"
                      className={styles.progressButton}
                      disabled={!unlocked}
                      onClick={() => scrollSectionIntoView(step.sectionId, true)}
                    >
                      <span className={styles.progressDot}>
                        {done ? (
                          <Check size={14} aria-hidden="true" />
                        ) : (
                          step.id
                        )}
                      </span>
                      <span className={styles.progressText}>
                        <span className={styles.progressLabel}>
                          {step.label}
                        </span>
                        <span className={styles.progressCaption}>
                          {step.caption}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            {/* PARTITION 1: Contact Details (Name + Phone, Email auto-fetched) */}
            <section
              id="partition-contact"
              className={`${styles.card} ${
                contactComplete ? styles.cardComplete : styles.cardActive
              }`}
              aria-labelledby="step-contact-heading"
            >
              <header className={styles.cardHead}>
                <span
                  className={`${styles.stepBadge} ${
                    contactComplete ? styles.stepBadgeDone : ""
                  }`}
                  aria-hidden="true"
                >
                  {contactComplete ? <Check size={17} /> : "1"}
                </span>
                <div className={styles.cardHeadCopy}>
                  <div className={styles.cardKickerRow}>
                    <span className={styles.cardKicker}>Section 1 of 4</span>
                    <span
                      className={`${styles.statusPill} ${
                        contactComplete
                          ? styles.statusPillDone
                          : styles.statusPillActive
                      }`}
                    >
                      {contactComplete ? "Completed" : "Step 1"}
                    </span>
                  </div>
                  <h2 id="step-contact-heading" className={styles.cardTitle}>
                    Passenger contact details
                  </h2>
                </div>
              </header>

              {canFillFromProfile ? (
                <div className={styles.profileHelperBar}>
                  <span className={styles.profileHelperText}>
                    <User size={15} aria-hidden="true" />
                    Saved contact details found on your profile
                  </span>
                  <button
                    type="button"
                    className={styles.profileFillButton}
                    onClick={fillFromProfile}
                  >
                    Use saved details
                  </button>
                </div>
              ) : null}

              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label className={styles.label} htmlFor="booking-full-name">
                    Full name <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="booking-full-name"
                    className={`${styles.input} ${
                      errors.full_name ? styles.inputError : ""
                    }`}
                    type="text"
                    name="full_name"
                    autoComplete="name"
                    maxLength={160}
                    required
                    value={form.full_name}
                    placeholder="e.g. Amina Juma"
                    aria-invalid={Boolean(errors.full_name)}
                    onChange={(event) =>
                      update("full_name", event.target.value)
                    }
                    onBlur={() => touch("full_name")}
                  />
                  {errors.full_name ? (
                    <p className={styles.errorText} role="alert">
                      {errors.full_name}
                    </p>
                  ) : null}
                </div>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="booking-phone">
                    Phone number <span aria-hidden="true">*</span>
                  </label>
                  <input
                    id="booking-phone"
                    className={`${styles.input} ${
                      errors.phone ? styles.inputError : ""
                    }`}
                    type="tel"
                    name="phone"
                    inputMode="tel"
                    autoComplete="tel"
                    maxLength={40}
                    required
                    value={form.phone}
                    placeholder="+255 777 000 111"
                    aria-invalid={Boolean(errors.phone)}
                    onChange={(event) => update("phone", event.target.value)}
                    onBlur={() => touch("phone")}
                  />
                  {errors.phone ? (
                    <p className={styles.errorText} role="alert">
                      {errors.phone}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Email fetched from account */}
              <div className={styles.emailBlock}>
                {authLoading || profileLoading ? (
                  <div className={styles.fetchedEmailCard} role="status">
                    <span className={styles.fetchedEmailIcon}>
                      <Loader2
                        className={styles.spin}
                        size={17}
                        aria-hidden="true"
                      />
                    </span>
                    <div className={styles.fetchedEmailCopy}>
                      <span className={styles.fetchedEmailLabel}>Email</span>
                      <span className={styles.fetchedEmailValue}>
                        Fetching your account emailâ€¦
                      </span>
                    </div>
                  </div>
                ) : showingFetchedEmailCard ? (
                  <div className={styles.fetchedEmailCard}>
                    <span className={styles.fetchedEmailIconReady}>
                      <MailCheck size={17} aria-hidden="true" />
                    </span>
                    <div className={styles.fetchedEmailCopy}>
                      <div className={styles.fetchedEmailHeader}>
                        <span className={styles.fetchedEmailLabel}>
                          Confirmation email
                        </span>
                        <span className={styles.fetchedBadge}>
                          Fetched from account
                        </span>
                      </div>
                      <strong className={styles.fetchedEmailValue}>
                        {effectiveEmail}
                      </strong>
                    </div>
                    <button
                      type="button"
                      className={styles.emailEditButton}
                      onClick={() => {
                        setCustomEmail(effectiveEmail);
                        setEditingEmail(true);
                      }}
                    >
                      Change
                    </button>
                  </div>
                ) : (
                  <div className={styles.guestEmailWrap}>
                    {!user ? (
                      <div className={styles.signInBanner}>
                        <span className={styles.signInBannerCopy}>
                          <Mail size={15} aria-hidden="true" />
                          Sign in to fetch your email automatically, or enter it
                          below.
                        </span>
                        <Link href={loginReturnUrl} className={styles.signInLink}>
                          <LogIn size={14} aria-hidden="true" />
                          Sign in
                        </Link>
                      </div>
                    ) : null}

                    <div className={styles.field}>
                      <div className={styles.emailInputHead}>
                        <label className={styles.label} htmlFor="booking-email">
                          Email address <span aria-hidden="true">*</span>
                        </label>
                        {hasFetchedEmail ? (
                          <button
                            type="button"
                            className={styles.emailResetLink}
                            onClick={() => {
                              setCustomEmail(null);
                              setEditingEmail(false);
                            }}
                          >
                            Use account email ({fetchedEmail})
                          </button>
                        ) : null}
                      </div>
                      <input
                        id="booking-email"
                        className={`${styles.input} ${
                          errors.email ? styles.inputError : ""
                        }`}
                        type="email"
                        name="email"
                        inputMode="email"
                        autoComplete="email"
                        maxLength={254}
                        required
                        value={effectiveEmail}
                        placeholder="you@example.com"
                        aria-invalid={Boolean(errors.email)}
                        onChange={(event) => setCustomEmail(event.target.value)}
                        onBlur={() => touch("email")}
                      />
                      {errors.email ? (
                        <p className={styles.errorText} role="alert">
                          {errors.email}
                        </p>
                      ) : (
                        <p className={styles.hintText}>
                          We will send your trip confirmation to this email.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {!showSchedulePartition ? (
                <div className={styles.nextPartitionCue}>
                  <ArrowRight size={14} aria-hidden="true" />
                  <span>
                    Complete your name and phone number to reveal{" "}
                    <strong>Passengers, Travel Date &amp; Time</strong> below.
                  </span>
                </div>
              ) : null}
            </section>

            {/* PARTITION 2: Passengers, Travel Date, Travel Time */}
            {showSchedulePartition ? (
              <section
                id="partition-schedule"
                className={`${styles.card} ${
                  journeyComplete ? styles.cardComplete : styles.cardActive
                }`}
                aria-labelledby="step-schedule-heading"
              >
                <header className={styles.cardHead}>
                  <span
                    className={`${styles.stepBadge} ${
                      journeyComplete ? styles.stepBadgeDone : ""
                    }`}
                    aria-hidden="true"
                  >
                    {journeyComplete ? <Check size={17} /> : "2"}
                  </span>
                  <div className={styles.cardHeadCopy}>
                    <div className={styles.cardKickerRow}>
                      <span className={styles.cardKicker}>Section 2 of 4</span>
                      <span
                        className={`${styles.statusPill} ${
                          journeyComplete
                            ? styles.statusPillDone
                            : styles.statusPillActive
                        }`}
                      >
                        {journeyComplete ? "Completed" : "Step 2"}
                      </span>
                    </div>
                    <h2 id="step-schedule-heading" className={styles.cardTitle}>
                      Passengers, travel date &amp; travel time
                    </h2>

                  </div>
                </header>

                <div className={styles.scheduleGrid}>
                  <div className={styles.field}>
                    <label
                      className={styles.label}
                      htmlFor="booking-passengers"
                    >
                      Passengers <span aria-hidden="true">*</span>
                    </label>
                    <div className={styles.passengerCounter}>
                      <button
                        type="button"
                        className={styles.counterButton}
                        aria-label="Decrease passengers"
                        disabled={passengersCount <= 1}
                        onClick={() => {
                          touch("passengers");
                          update(
                            "passengers",
                            String(Math.max(1, (passengersCount || 1) - 1)),
                          );
                        }}
                      >
                        âˆ’
                      </button>
                      <input
                        id="booking-passengers"
                        className={`${styles.input} ${styles.counterInput} ${
                          errors.passengers ? styles.inputError : ""
                        }`}
                        type="number"
                        name="passengers"
                        inputMode="numeric"
                        min={1}
                        max={maxPassengers}
                        required
                        value={form.passengers}
                        aria-invalid={Boolean(errors.passengers)}
                        onChange={(event) =>
                          update("passengers", event.target.value)
                        }
                        onBlur={() => touch("passengers")}
                      />
                      <button
                        type="button"
                        className={styles.counterButton}
                        aria-label="Increase passengers"
                        disabled={passengersCount >= maxPassengers}
                        onClick={() => {
                          touch("passengers");
                          update(
                            "passengers",
                            String(
                              Math.min(maxPassengers, (passengersCount || 0) + 1),
                            ),
                          );
                        }}
                      >
                        +
                      </button>
                    </div>
                    {errors.passengers ? (
                      <p className={styles.errorText} role="alert">
                        {errors.passengers}
                      </p>
                    ) : (
                      <p className={styles.hintText}>
                        {isPublicBooking
                          ? `Up to ${maxPassengers} passengers.`
                          : `Max ${maxPassengers} seats for this vehicle.`}
                      </p>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label
                      className={styles.label}
                      htmlFor="booking-travel-date"
                    >
                      Travel date <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id="booking-travel-date"
                      className={`${styles.input} ${
                        errors.travel_date ? styles.inputError : ""
                      }`}
                      type="date"
                      name="travel_date"
                      min={today}
                      required
                      value={form.travel_date}
                      aria-invalid={Boolean(errors.travel_date)}
                      onChange={(event) =>
                        update("travel_date", event.target.value)
                      }
                      onBlur={() => touch("travel_date")}
                    />
                    {errors.travel_date ? (
                      <p className={styles.errorText} role="alert">
                        {errors.travel_date}
                      </p>
                    ) : form.travel_date ? (
                      <p className={styles.hintText}>
                        {formatFormDate(form.travel_date)}
                      </p>
                    ) : (
                      <p className={styles.hintText}>Today or any future date.</p>
                    )}
                  </div>

                  <div className={styles.field}>
                    <label
                      className={styles.label}
                      htmlFor="booking-pickup-time"
                    >
                      Travel time <span aria-hidden="true">*</span>
                    </label>
                    <input
                      id="booking-pickup-time"
                      className={`${styles.input} ${
                        errors.pickup_time ? styles.inputError : ""
                      }`}
                      type="time"
                      name="pickup_time"
                      required
                      value={form.pickup_time}
                      aria-invalid={Boolean(errors.pickup_time)}
                      onChange={(event) =>
                        update("pickup_time", event.target.value)
                      }
                      onBlur={() => touch("pickup_time")}
                    />
                    {errors.pickup_time ? (
                      <p className={styles.errorText} role="alert">
                        {errors.pickup_time}
                      </p>
                    ) : (
                      <p className={styles.hintText}>Local Zanzibar time (EAT).</p>
                    )}
                  </div>
                </div>

                {!showRoutePartition ? (
                  <div className={styles.nextPartitionCue}>
                    <ArrowRight size={14} aria-hidden="true" />
                    <span>
                      {destinationPrefilledActive ? (
                        <>
                          Select your travel date and time to unlock{" "}
                          <strong>Origin &amp; Destination</strong> — your
                          destination (<strong>{form.destination}</strong>) is
                          already filled in, so you only need to choose your
                          pickup origin.
                        </>
                      ) : (
                        <>
                          Select your travel date and time to unlock{" "}
                          <strong>Origin &amp; Destination (Trip Generator)</strong>{" "}
                          below.
                        </>
                      )}
                    </span>
                  </div>
                ) : null}
              </section>
            ) : null}

            {/* PARTITION 3: Origin & Destination (Trip Generated) */}
            {showRoutePartition ? (
              <section
                id="partition-route"
                className={`${styles.card} ${
                  routeComplete ? styles.cardComplete : styles.cardActive
                }`}
                aria-labelledby="step-route-heading"
              >
                <header className={styles.cardHead}>
                  <span
                    className={`${styles.stepBadge} ${
                      routeComplete ? styles.stepBadgeDone : ""
                    }`}
                    aria-hidden="true"
                  >
                    {routeComplete ? <Check size={17} /> : "3"}
                  </span>
                  <div className={styles.cardHeadCopy}>
                    <div className={styles.cardKickerRow}>
                      <span className={styles.cardKicker}>Section 3 of 4</span>
                      <span
                        className={`${styles.statusPill} ${
                          routeComplete
                            ? styles.statusPillDone
                            : styles.statusPillActive
                        }`}
                      >
                        {routeComplete ? "Trip generated" : "Step 3"}
                      </span>
                    </div>
                    <h2 id="step-route-heading" className={styles.cardTitle}>
                      Origin &amp; destination
                    </h2>
                  </div>
                </header>

                <div className={styles.routeFields}>
                  <PlaceAutocomplete
                    label="Origin (Pickup location)"
                    name="origin"
                    variant="origin"
                    value={form.origin}
                    required
                    maxLength={255}
                    pinned={form.originSource !== "none"}
                    pinnedLabel={
                      form.originSource === "gps"
                        ? "GPS"
                        : form.originSource === "custom"
                          ? "Custom"
                          : "Selected"
                    }
                    placeholder="Start typing or pick e.g. Abeid Amani Karume Airport"
                    hint="Start typing for instant suggestions, or tap Use current location."
                    error={errors.origin}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        origin: value,
                        originLat: null,
                        originLng: null,
                        originSource: "none",
                      }))
                    }
                    onSelect={(place) =>
                      setForm((current) => ({
                        ...current,
                        origin: placeLabel(place),
                        originLat: place.latitude,
                        originLng: place.longitude,
                        originSource: "suggestion",
                      }))
                    }
                    onCustomConfirm={(value) =>
                      confirmCustomLocation("origin", value)
                    }
                    onBlur={() => handlePlaceBlur("origin")}
                    action={
                      <button
                        type="button"
                        className={styles.locationButton}
                        onClick={useCurrentLocation}
                        disabled={locating}
                      >
                        {locating ? (
                          <Loader2
                            className={styles.spin}
                            size={15}
                            aria-hidden="true"
                          />
                        ) : (
                          <LocateFixed size={15} aria-hidden="true" />
                        )}
                        {locating ? "Locatingâ€¦" : "Use current location"}
                      </button>
                    }
                  />

                  <div className={styles.swapRow}>
                    <span className={styles.swapLine} aria-hidden="true" />
                    <button
                      type="button"
                      className={styles.swapButton}
                      onClick={swapRoute}
                      disabled={!form.origin.trim() && !form.destination.trim()}
                    >
                      <ArrowUpDown size={13} aria-hidden="true" />
                      Swap origin &amp; destination
                    </button>
                    <span className={styles.swapLine} aria-hidden="true" />
                  </div>

                  <PlaceAutocomplete
                    label="Destination (Drop-off location)"
                    name="destination"
                    variant="destination"
                    value={form.destination}
                    required
                    maxLength={255}
                    pinned={form.destSource !== "none" && !sameRoute}
                    pinnedLabel={
                      destinationPrefilledActive
                        ? "From trip"
                        : form.destSource === "custom"
                          ? "Custom"
                          : "Selected"
                    }
                    placeholder="Start typing or pick e.g. Nungwi, Kendwa, Paje"
                    hint={
                      destinationPrefilledActive
                        ? "Auto-filled from your selected trip — just fill your pickup origin above (or change this destination anytime)."
                        : "Choose a suggested Zanzibar destination to compute distance & travel time."
                    }
                    error={errors.destination}
                    onChange={(value) => {
                      setDestinationEditedByUser(true);
                      setForm((current) => ({
                        ...current,
                        destination: value,
                        destLat: null,
                        destLng: null,
                        destSource: "none",
                      }));
                    }}
                    onSelect={(place) => {
                      setDestinationEditedByUser(true);
                      setForm((current) => ({
                        ...current,
                        destination: placeLabel(place),
                        destLat: place.latitude,
                        destLng: place.longitude,
                        destSource: "suggestion",
                      }));
                    }}
                    onCustomConfirm={(value) => {
                      setDestinationEditedByUser(true);
                      confirmCustomLocation("destination", value);
                    }}
                    onBlur={() => handlePlaceBlur("destination")}
                  />
                </div>

                {locationError ? (
                  <p className={styles.locationError} role="alert">
                    <AlertCircle size={15} aria-hidden="true" />
                    <span>{locationError}</span>
                  </p>
                ) : null}

                {/* Generated Trip Card */}
                {routeComplete ? (
                  <div className={styles.generatedTripCard} aria-live="polite">
                    <div className={styles.generatedTripHead}>
                      <div className={styles.generatedTripBadge}>
                        <span className={styles.liveDot} aria-hidden="true" />
                        Trip generated
                      </div>
                      <span className={styles.generatedTripSub}>
                        {isPublicBooking
                          ? "Connected to Private hire request"
                          : `Connected to ${service?.title || "Private hire"}`}
                      </span>
                    </div>

                    <div className={styles.generatedStops}>
                      <div className={styles.generatedStop}>
                        <span
                          className={`${styles.stopMarker} ${styles.stopMarkerOrigin}`}
                          aria-hidden="true"
                        >
                          A
                        </span>
                        <div className={styles.stopInfo}>
                          <span className={styles.stopLabel}>
                            Origin
                            {form.originSource === "gps"
                              ? " Â· Current GPS location"
                              : ""}
                          </span>
                          <strong className={styles.stopName}>
                            {form.origin}
                          </strong>
                        </div>
                      </div>

                      <div className={styles.stopConnector} aria-hidden="true" />

                      <div className={styles.generatedStop}>
                        <span
                          className={`${styles.stopMarker} ${styles.stopMarkerDest}`}
                          aria-hidden="true"
                        >
                          B
                        </span>
                        <div className={styles.stopInfo}>
                          <span className={styles.stopLabel}>Destination</span>
                          <strong className={styles.stopName}>
                            {form.destination}
                          </strong>
                        </div>
                      </div>
                    </div>

                    <div className={styles.routePreview}>
                      {visibleRouteLoading ? (
                        <div className={styles.routeMetric}>
                          <span className={styles.routeMetricIcon}>
                            <Loader2
                              className={styles.spin}
                              size={15}
                              aria-hidden="true"
                            />
                          </span>
                          <span className={styles.routeMetricText}>
                            <span className={styles.routeMetricLabel}>
                              Calculating trip
                            </span>
                            <span className={styles.routeMetricValue}>
                              Computing road distance &amp; durationâ€¦
                            </span>
                          </span>
                        </div>
                      ) : visibleRoute ? (
                        <>
                          <div className={styles.routeMetric}>
                            <span className={styles.routeMetricIcon}>
                              <RouteIcon size={15} aria-hidden="true" />
                            </span>
                            <span className={styles.routeMetricText}>
                              <span className={styles.routeMetricLabel}>
                                Distance
                              </span>
                              <span className={styles.routeMetricValue}>
                                {formatDistance(visibleRoute.distanceKm)}
                              </span>
                            </span>
                          </div>
                          <div className={styles.routeMetric}>
                            <span className={styles.routeMetricIcon}>
                              <Clock size={15} aria-hidden="true" />
                            </span>
                            <span className={styles.routeMetricText}>
                              <span className={styles.routeMetricLabel}>
                                Est. travel time
                              </span>
                              <span className={styles.routeMetricValue}>
                                {formatDuration(visibleRoute.durationMins)}
                              </span>
                            </span>
                          </div>
                          <div className={styles.routeMetric}>
                            <span className={styles.routeMetricIcon}>
                              <Navigation size={15} aria-hidden="true" />
                            </span>
                            <span className={styles.routeMetricText}>
                              <span className={styles.routeMetricLabel}>
                                Route type
                              </span>
                              <span className={styles.routeMetricValue}>
                                {visibleRoute.source === "osrm"
                                  ? "Road route"
                                  : "Direct estimate"}
                              </span>
                            </span>
                          </div>
                        </>
                      ) : (
                        <p className={styles.routePreviewNote}>
                          {visibleRouteError ? (
                            <span className={styles.routePreviewError}>
                              {visibleRouteError}
                            </span>
                          ) : (
                            "Trip route saved. Your provider will confirm exact driving distance and pickup timing."
                          )}
                        </p>
                      )}
                    </div>

                    {hasRouteCoords &&
                    originLat != null &&
                    originLng != null &&
                    destLat != null &&
                    destLng != null ? (
                      <div className={styles.mapToggleWrap}>
                        <button
                          type="button"
                          className={styles.mapToggleButton}
                          aria-expanded={showRouteMap}
                          onClick={() => setShowRouteMap((open) => !open)}
                        >
                          <MapIcon size={15} aria-hidden="true" />
                          {showRouteMap ? "Hide trip route map" : "Preview trip on Zanzibar map"}
                          {showRouteMap ? (
                            <ChevronUp size={15} aria-hidden="true" />
                          ) : (
                            <ChevronDown size={15} aria-hidden="true" />
                          )}
                        </button>

                        {showRouteMap ? (
                          <div className={styles.mapContainer}>
                            <TripRouteOverlayMap
                              originLat={originLat}
                              originLng={originLng}
                              destinationLat={destLat}
                              destinationLng={destLng}
                              originLabel={form.origin}
                              destinationLabel={form.destination}
                              routeOnly={isPublicBooking}
                            />
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {/* LIVE ROUTE FARE PREVIEW & OPTION SELECTOR ($ & TSh) */}
                    {activeRouteQuote ? (
                      <div className={styles.fareQuoteCard}>
                        <div className={styles.fareQuoteHead}>
                          <span className={styles.fareQuoteTitle}>
                            <DollarSign size={14} aria-hidden="true" />
                            Trip price ($ &amp; TSh)
                          </span>
                          <span className={styles.fareQuoteSub}>
                            {activeRouteQuote.matchedLabel} · $1 = {formatTzs(activeRouteQuote.exchangeRate)}
                          </span>
                        </div>

                        <div
                          className={styles.fareOptionsGrid}
                          role="radiogroup"
                          aria-label="Choose trip pricing option"
                        >
                          {TRIP_PRICING_OPTIONS.map((opt) => {
                            const usd = getOptionPriceUsd(activeRouteQuote, opt.key);
                            const tzs = usdToTzs(usd);
                            const active = tripOption === opt.key;
                            return (
                              <button
                                key={opt.key}
                                type="button"
                                role="radio"
                                aria-checked={active}
                                className={`${styles.fareOptionCard} ${
                                  active ? styles.fareOptionCardActive : ""
                                }`}
                                onClick={() => setTripOption(opt.key)}
                              >
                                <span className={styles.fareOptionName}>{opt.label}</span>
                                <strong className={styles.fareOptionUsd}>{formatUsd(usd)}</strong>
                                <span className={styles.fareOptionTzs}>{formatTzs(tzs)}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className={styles.nextPartitionCue}>
                    <ArrowRight size={14} aria-hidden="true" />
                    <span>
                      {destConfirmed && !originConfirmed ? (
                        <>
                          Choose or enter your pickup <strong>Origin</strong>{" "}
                          above to generate your trip and reveal{" "}
                          <strong>Description &amp; Submit</strong> below.
                        </>
                      ) : (
                        <>
                          Pick both an origin and destination to generate your
                          trip and reveal{" "}
                          <strong>Description &amp; Submit</strong> below.
                        </>
                      )}
                    </span>
                  </div>
                )}
              </section>
            ) : null}

            {/* PARTITION 4: Add Description (Optional) & Submit */}
            {showConfirmPartition ? (
              <section
                id="partition-confirm"
                className={`${styles.card} ${styles.cardActive}`}
                aria-labelledby="step-notes-heading"
              >
                <header className={styles.cardHead}>
                  <span className={styles.stepBadge} aria-hidden="true">
                    4
                  </span>
                  <div className={styles.cardHeadCopy}>
                    <div className={styles.cardKickerRow}>
                      <span className={styles.cardKicker}>Section 4 of 4</span>
                      <span className={styles.statusPillOptional}>Optional notes</span>
                    </div>
                    <h2 id="step-notes-heading" className={styles.cardTitle}>
                      Add trip description &amp; send request
                    </h2>
                  </div>
                </header>

                <div className={styles.field}>
                  <label className={styles.label} htmlFor="booking-notes">
                    <span className={styles.optionalLabelRow}>
                      <FileText size={14} aria-hidden="true" />
                      Description <em>(Optional)</em>
                    </span>
                  </label>
                  <textarea
                    id="booking-notes"
                    className={styles.textarea}
                    name="notes"
                    rows={4}
                    maxLength={5000}
                    value={form.notes}
                    placeholder="Share luggage needs, flight number, hotel gate/entrance, child seat requests, or any special instructions for your tripâ€¦"
                    onChange={(event) => update("notes", event.target.value)}
                  />
                  <p className={styles.hintText}>
                    {form.notes.length} / 5000 characters
                  </p>
                </div>

                {/* Compact Trip Recap */}
                <div className={styles.recapBox}>
                  <span className={styles.recapTitle}>Generated trip ready to book</span>
                  <div className={styles.recapGrid}>
                    <div>
                      <span className={styles.recapLabel}>Route</span>
                      <strong className={styles.recapValue}>
                        {form.origin || "â€”"} â†’ {form.destination || "â€”"}
                      </strong>
                    </div>
                    <div>
                      <span className={styles.recapLabel}>Schedule</span>
                      <strong className={styles.recapValue}>
                        {travelDateValid ? formatFormDate(form.travel_date) : "â€”"}
                        {travelTimeValid ? ` Â· ${form.pickup_time}` : ""}
                      </strong>
                    </div>
                    <div>
                      <span className={styles.recapLabel}>Passengers</span>
                      <strong className={styles.recapValue}>
                        {passengersValid
                          ? `${form.passengers} ${
                              passengersCount === 1 ? "passenger" : "passengers"
                            }`
                          : "â€”"}
                      </strong>
                    </div>
                    <div>
                      <span className={styles.recapLabel}>Contact</span>
                      <strong className={styles.recapValue}>
                        {form.full_name.trim() || "—"} ·{" "}
                        {form.phone.trim() || "—"}
                      </strong>
                    </div>
                    {selectedFareUsd != null && selectedFareTzs != null ? (
                      <div className={styles.recapPriceSpan}>
                        <span className={styles.recapLabel}>
                          Trip price ({selectedOptionMeta.label})
                        </span>
                        <strong className={styles.recapPriceValue}>
                          {formatUsd(selectedFareUsd)} · {formatTzs(selectedFareTzs)}
                        </strong>
                      </div>
                    ) : null}
                  </div>
                </div>

                {formError ? (
                  <p className={styles.alert} role="alert">
                    <AlertCircle size={17} aria-hidden="true" />
                    <span>{formError}</span>
                  </p>
                ) : null}

                <div className={styles.submitRow}>
                  <p className={styles.submitNote}>
                    <ShieldCheck size={16} aria-hidden="true" />
                    <span>
                      {isPublicBooking
                        ? "No payment is taken now. Your private hire request is published for verified drivers to confirm availability and pickup details."
                        : `No payment is taken now. ${providerName} reviews your generated trip and confirms availability & final fare.`}
                    </span>
                  </p>
                  <button
                    type="submit"
                    className={styles.submitButton}
                    disabled={sending}
                  >
                    {sending ? (
                      <>
                        <Loader2
                          className={styles.spin}
                          size={17}
                          aria-hidden="true"
                        />
                        Sending requestâ€¦
                      </>
                    ) : (
                      <>
                        Send Private Hire Request
                        <ArrowRight size={17} aria-hidden="true" />
                      </>
                    )}
                  </button>
                </div>
              </section>
            ) : null}
          </form>
        </main>

        {/* STICKY LIVE TRIP SUMMARY SIDEBAR */}
        <aside className={styles.aside}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryMedia}>
              {service?.vehicle?.front_image_url ? (
                <Image
                  src={getImageUrl(service.vehicle.front_image_url)}
                  alt={service.vehicle.name}
                  fill
                  sizes="360px"
                  className={styles.summaryImage}
                  unoptimized={isUnoptimizableImage(getImageUrl(service.vehicle.front_image_url))}
                />
              ) : (
                <span className={styles.summaryMediaEmpty}>
                  <Car size={30} aria-hidden="true" />
                </span>
              )}
              <span
                className={`${styles.summaryTripStatus} ${
                  routeComplete ? styles.summaryTripStatusReady : ""
                }`}
              >
                {routeComplete ? "Trip generated" : "Building trip"}
              </span>
            </div>

            <span className={styles.summaryKicker}>
              {isPublicBooking ? "Private hire request" : "Private hire trip"}
            </span>
            <h2 className={styles.summaryTitle}>
              {isPublicBooking
                ? "Request Private Hire Transport"
                : service?.title || "Private hire request"}
            </h2>
            {!isPublicBooking && service?.company ? (
              <p className={styles.summaryCompany}>{service.company.name}</p>
            ) : null}

            {selectedFareUsd != null && selectedFareTzs != null ? (
              <div className={styles.summaryPriceRow}>
                <span className={styles.summaryPrice}>{formatUsd(selectedFareUsd)}</span>
                <span className={styles.summaryUnit}>
                  {formatTzs(selectedFareTzs)} · {selectedOptionMeta.shortLabel}
                </span>
              </div>
            ) : null}

            <div className={styles.summaryList}>
              <div className={styles.summaryRow}>
                <User size={15} aria-hidden="true" />
                <span className={styles.summaryRowText}>
                  <span className={styles.summaryRowLabel}>Passenger</span>
                  <span className={styles.summaryRowValue}>
                    {form.full_name.trim()
                      ? `${form.full_name.trim()}${
                          form.phone.trim() ? ` Â· ${form.phone.trim()}` : ""
                        }`
                      : "Enter name & phone"}
                  </span>
                </span>
              </div>

              <div className={styles.summaryRow}>
                <Mail size={15} aria-hidden="true" />
                <span className={styles.summaryRowText}>
                  <span className={styles.summaryRowLabel}>Email</span>
                  <span className={styles.summaryRowValue}>
                    {effectiveEmail || (authLoading ? "Fetchingâ€¦" : "Not set")}
                  </span>
                </span>
              </div>

              <div className={styles.summaryRow}>
                <CalendarDays size={15} aria-hidden="true" />
                <span className={styles.summaryRowText}>
                  <span className={styles.summaryRowLabel}>Date &amp; time</span>
                  <span className={styles.summaryRowValue}>
                    {travelDateValid
                      ? `${formatFormDate(form.travel_date)}${
                          travelTimeValid ? ` at ${form.pickup_time}` : ""
                        }`
                      : "Not selected yet"}
                  </span>
                </span>
              </div>

              <div className={styles.summaryRow}>
                <Users size={15} aria-hidden="true" />
                <span className={styles.summaryRowText}>
                  <span className={styles.summaryRowLabel}>Passengers</span>
                  <span className={styles.summaryRowValue}>
                    {passengersValid
                      ? `${form.passengers} of ${maxPassengers} max`
                      : "Not selected"}
                  </span>
                </span>
              </div>

              <div className={styles.summaryRow}>
                <MapPin size={15} aria-hidden="true" />
                <span className={styles.summaryRowText}>
                  <span className={styles.summaryRowLabel}>Trip route</span>
                  <span className={styles.summaryRowValue}>
                    {routeComplete
                      ? `${form.origin} → ${form.destination}`
                      : form.origin.trim()
                        ? `${form.origin} → ${form.destination.trim() || "Choose destination"}`
                        : form.destination.trim()
                          ? `Choose origin → ${form.destination}`
                          : "Origin & destination"}
                  </span>
                </span>
              </div>

              {visibleRoute ? (
                <div className={styles.summaryRow}>
                  <RouteIcon size={15} aria-hidden="true" />
                  <span className={styles.summaryRowText}>
                    <span className={styles.summaryRowLabel}>Journey estimate</span>
                    <span className={styles.summaryRowValue}>
                      {formatDistance(visibleRoute.distanceKm)} Â·{" "}
                      {formatDuration(visibleRoute.durationMins)}
                    </span>
                  </span>
                </div>
              ) : null}

              <div className={styles.summaryRow}>
                <Car size={15} aria-hidden="true" />
                <span className={styles.summaryRowText}>
                  <span className={styles.summaryRowLabel}>Vehicle &amp; driver</span>
                  <span className={styles.summaryRowValue}>
                    {isPublicBooking
                      ? "Private hire · assigned on confirmation"
                      : service?.vehicle
                        ? `${service.vehicle.name} · ${driverName}`
                        : driverName}
                  </span>
                </span>
              </div>
            </div>

            <p className={styles.summaryNote}>
              {isPublicBooking
                ? "Submitting creates a linked trip record and sends your private hire request for confirmation."
                : `Submitting creates a linked trip record and sends your request to ${providerName} for confirmation.`}
            </p>
          </div>

          {!isPublicBooking && service ? (
            <div className={styles.helpCard}>
              <h2 className={styles.helpTitle}>Need help?</h2>
              <p className={styles.helpText}>
                {service.company?.contact_phone || service.driver?.phone
                  ? "Call the provider directly if you have questions about this vehicle or route."
                  : "Questions about this vehicle? Contact the provider through their profile."}
              </p>
              {service.company?.contact_phone ? (
                <a
                  href={`tel:${service.company.contact_phone.replace(/\D/g, "")}`}
                  className={styles.helpPhone}
                >
                  <Phone size={14} aria-hidden="true" />
                  {service.company.contact_phone}
                </a>
              ) : service.driver?.phone ? (
                <a
                  href={`tel:${service.driver.phone.replace(/\D/g, "")}`}
                  className={styles.helpPhone}
                >
                  <Phone size={14} aria-hidden="true" />
                  {service.driver.phone}
                </a>
              ) : service.company ? (
                <Link
                  href={`/company/${service.company.slug}/`}
                  className={styles.helpPhone}
                >
                  View provider profile
                  <ArrowRight size={14} aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          ) : (
            <div className={styles.helpCard}>
              <h2 className={styles.helpTitle}>Prefer a specific company?</h2>
              <p className={styles.helpText}>
                Browse verified transport providers to choose a specific vehicle and company directly.
              </p>
              <Link href="/transport/" className={styles.helpPhone}>
                Browse vehicles
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
