"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ArrowUpDown,
  CalendarDays,
  Car,
  Check,
  CheckCircle2,
  Clock,
  Loader2,
  LocateFixed,
  MapPin,
  Navigation,
  Phone,
  Route as RouteIcon,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import {
  publicPrivateHireAPI,
  routeAPI,
  transportBookingsAPI,
} from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import { getImageUrl } from "@/lib/utils/image-url";
import PlaceAutocomplete from "@/components/PlaceAutocomplete";
import type { PlaceSuggestion } from "@/lib/place-types";
import styles from "@/features/pages/booking-trip.module.css";

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
  } | null;
  driver: { name: string; phone?: string | null } | null;
  company: {
    name: string;
    slug: string;
    contact_phone?: string | null;
  } | null;
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
  trip_request_id: number | null;
  trip: { id: number; status: string } | null;
  service: { title: string } | null;
};

type FormState = {
  full_name: string;
  phone: string;
  email: string;
  passengers: string;
  travel_date: string;
  pickup_time: string;
  origin: string;
  originLat: number | null;
  originLng: number | null;
  destination: string;
  destLat: number | null;
  destLng: number | null;
  notes: string;
};

type RouteEstimate = {
  distanceKm: number;
  durationMins: number;
  source: string;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

const STEPS = [
  { id: 1, label: "Contact" },
  { id: 2, label: "Journey" },
  { id: 3, label: "Route" },
  { id: 4, label: "Confirm" },
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
    "We could not send your request. Please try again."
  );
}

export default function BookingPage() {
  const params = useParams<Record<string, string>>();
  const serviceId = params.serviceId;
  const { user } = useAuth();

  const [service, setService] = useState<Service | null>(null);
  const [loadedServiceId, setLoadedServiceId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [booking, setBooking] = useState<BookingResult | null>(null);
  const [formError, setFormError] = useState("");
  const [locationError, setLocationError] = useState("");
  const [locating, setLocating] = useState(false);
  const [routeResult, setRouteResult] = useState<{
    key: string;
    route: RouteEstimate | null;
    error: string;
  } | null>(null);
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const [form, setForm] = useState<FormState>({
    full_name: "",
    phone: "",
    email: "",
    passengers: "1",
    travel_date: "",
    pickup_time: "",
    origin: "",
    originLat: null,
    originLng: null,
    destination: "",
    destLat: null,
    destLng: null,
    notes: "",
  });

  const today = useMemo(() => localDateIso(), []);
  const loading = Boolean(serviceId) && loadedServiceId !== serviceId;

  useEffect(() => {
    if (!serviceId) return;
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
  }, [serviceId]);

  useEffect(() => {
    if (!user) return;
    // Auth resolves after the first paint. Sync the prefilled contact fields
    // once the signed-in user is available, without overwriting typed values.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setForm((current) => ({
      ...current,
      full_name: current.full_name || user.username || "",
      email: current.email || user.email || "",
    }));
  }, [user]);

  const maxPassengers =
    service?.vehicle?.capacity && service.vehicle.capacity > 0
      ? service.vehicle.capacity
      : 100;

  const passengersCount = Number(form.passengers);
  const passengersValid =
    Number.isInteger(passengersCount) &&
    passengersCount >= 1 &&
    passengersCount <= maxPassengers;
  const travelDateValid =
    Boolean(form.travel_date) && form.travel_date >= today;
  const pickupTimeValid = TIME_PATTERN.test(form.pickup_time);
  const contactComplete =
    form.full_name.trim().length >= 2 &&
    form.phone.replace(/\D/g, "").length >= 7 &&
    EMAIL_PATTERN.test(form.email.trim());
  const journeyComplete = passengersValid && travelDateValid && pickupTimeValid;
  const sameRoute =
    form.origin.trim().toLowerCase() ===
    form.destination.trim().toLowerCase();
  const routeComplete =
    form.origin.trim().length >= 2 &&
    form.destination.trim().length >= 2 &&
    !sameRoute &&
    form.originLat != null &&
    form.originLng != null &&
    form.destLat != null &&
    form.destLng != null;
  const allComplete = contactComplete && journeyComplete && routeComplete;
  const currentStep = !contactComplete
    ? 1
    : !journeyComplete
      ? 2
      : !routeComplete
        ? 3
        : 4;

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (currentStep <= 1) return;
    const id =
      currentStep === 2
        ? "step-journey"
        : currentStep === 3
          ? "step-route"
          : "step-notes";
    const element = document.getElementById(id);
    if (element) {
      // Defer to allow the new section to render and animate in.
      const timer = window.setTimeout(() => {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 250);
      return () => window.clearTimeout(timer);
    }
  }, [currentStep]);

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
            "The route service is unavailable right now. You can still send your trip; the provider will confirm distance and timing.",
        });
      });

    return () => {
      active = false;
    };
  }, [routeKey, originLat, originLng, destLat, destLng]);

  const touch = useCallback((field: string) => {
    setTouched((current) =>
      current[field] ? current : { ...current, [field]: true },
    );
  }, []);

  const errors = {
    full_name:
      touched.full_name && form.full_name.trim().length < 2
        ? "Enter your full name."
        : "",
    phone:
      touched.phone && form.phone.replace(/\D/g, "").length < 7
        ? "Enter a phone number with at least 7 digits."
        : "",
    email:
      touched.email && !EMAIL_PATTERN.test(form.email.trim())
        ? "Enter a valid email address."
        : "",
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
      touched.pickup_time && !pickupTimeValid ? "Choose a pickup time." : "",
    origin:
      touched.origin && form.origin.trim().length < 2
        ? "Enter or select a pickup point."
        : "",
    destination:
      touched.destination && !form.destination.trim()
        ? "Enter or select a destination."
        : touched.destination && sameRoute
          ? "Destination must be different from the pickup point."
          : "",
  };

  const pricingLabel = service
    ? service.pricing_type.replaceAll("_", " ")
    : "";
  const providerName = service?.company?.name?.trim() || "The provider";
  const driverName = service?.driver?.name?.trim() || "Assigned driver";

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function useCurrentLocation() {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setLocationError("Your browser does not support location access.");
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

        setForm((current) => ({
          ...current,
          origin: label,
          originLat: lat,
          originLng: lng,
        }));
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        setLocationError(
          error.code === error.PERMISSION_DENIED
            ? "Location permission was denied. Type your pickup point instead."
            : "We could not access your location. Type your pickup point instead.",
        );
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 60_000 },
    );
  }

  function swapRoute() {
    setForm((current) => ({
      ...current,
      origin: current.destination,
      originLat: current.destLat,
      originLng: current.destLng,
      destination: current.origin,
      destLat: current.originLat,
      destLng: current.originLng,
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service) return;

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
      setFormError("Please complete all required details before sending your request.");
      return;
    }

    setSending(true);
    setFormError("");

    try {
      const response = await transportBookingsAPI.create({
        service_id: service.id,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
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

  if (loading) {
    return (
      <div className={`page ${styles.page}`}>
        <div className={styles.stateCard} role="status" aria-live="polite">
          <span className={styles.stateIcon}>
            <Loader2 className={styles.spin} size={26} aria-hidden="true" />
          </span>
          <h1 className={styles.stateTitle}>Loading private hire service…</h1>
          <p className={styles.stateText}>
            We are preparing your trip details.
          </p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className={`page ${styles.page}`}>
        <div className={styles.stateCard}>
          <span className={styles.stateIcon}>
            <Car size={26} aria-hidden="true" />
          </span>
          <h1 className={styles.stateTitle}>Service unavailable</h1>
          <p className={styles.stateText}>
            This private hire service is no longer available. Browse the
            directory to find another verified vehicle.
          </p>
          <Link href="/transport/" className={styles.stateLink}>
            Browse private hire services
          </Link>
        </div>
      </div>
    );
  }

  if (booking) {
    return (
      <div className={`page ${styles.page}`}>
        <div className={styles.successWrap}>
          <div className={styles.successCard}>
            <span className={styles.successIcon}>
              <CheckCircle2 size={34} aria-hidden="true" />
            </span>
            <span className={styles.eyebrow}>Request received</span>
            <h1 className={styles.successTitle}>
              Your trip request is on its way
            </h1>
            <p className={styles.successLead}>
              {providerName} will review your journey and confirm availability,
              the final price, and your pickup details.
            </p>

            <div className={styles.referenceBox}>
              <span className={styles.referenceLabel}>Booking reference</span>
              <strong className={styles.referenceValue}>
                {booking.reference ?? `#${booking.id}`}
              </strong>
            </div>

            <dl className={styles.successSummary}>
              <div className={styles.successSummaryRow}>
                <dt className={styles.successSummaryLabel}>Route</dt>
                <dd className={styles.successSummaryValue}>
                  {booking.origin || form.origin} →{" "}
                  {booking.destination || form.destination}
                </dd>
              </div>
              <div className={styles.successSummaryRow}>
                <dt className={styles.successSummaryLabel}>Date &amp; time</dt>
                <dd className={styles.successSummaryValue}>
                  {formatIsoDate(booking.travel_date) || formatFormDate(form.travel_date)}
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
                <dt className={styles.successSummaryLabel}>Vehicle</dt>
                <dd className={styles.successSummaryValue}>
                  {service.vehicle?.name || service.title}
                  {service.vehicle?.plate_number
                    ? ` · ${service.vehicle.plate_number}`
                    : ""}
                </dd>
              </div>
              {booking.distance_km != null || booking.duration_mins != null ? (
                <div className={styles.successSummaryRow}>
                  <dt className={styles.successSummaryLabel}>Journey</dt>
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
              <div className={styles.successSummaryRow}>
                <dt className={styles.successSummaryLabel}>Provider</dt>
                <dd className={styles.successSummaryValue}>
                  {providerName}
                </dd>
              </div>
            </dl>

            <div className={styles.nextSteps}>
              <div className={styles.nextStep}>
                <span className={styles.nextStepNumber}>1</span>
                <strong>Provider review</strong>
                <p>
                  {providerName} checks availability for your date and route.
                </p>
              </div>
              <div className={styles.nextStep}>
                <span className={styles.nextStepNumber}>2</span>
                <strong>Confirmation</strong>
                <p>
                  You receive the confirmed pickup details and final price.
                </p>
              </div>
              <div className={styles.nextStep}>
                <span className={styles.nextStepNumber}>3</span>
                <strong>Enjoy your trip</strong>
                <p>Meet your driver at the agreed pickup point.</p>
              </div>
            </div>

            <div className={styles.successActions}>
              <Link href="/my-transport/" className={styles.primaryLink}>
                View my trips
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

  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.hero}>
        {service.vehicle?.front_image_url ? (
          <div className={styles.heroMedia} aria-hidden="true">
            <Image
              src={getImageUrl(service.vehicle.front_image_url)}
              alt=""
              fill
              sizes="100vw"
              className={styles.heroImage}
              priority
              unoptimized
            />
            <span className={styles.heroScrim} />
          </div>
        ) : (
          <span className={styles.heroScrim} aria-hidden="true" />
        )}

        <div className={styles.heroInner}>
          <Link href="/transport/" className={styles.backLink}>
            <ArrowLeft size={15} aria-hidden="true" />
            All private hire services
          </Link>

          <div className={styles.heroMain}>
            <div className={styles.heroCopy}>
              <span className={styles.eyebrow}>
                <Sparkles size={14} aria-hidden="true" />
                Trip-first private hire
              </span>
              <h1 className={styles.heroTitle}>{service.title}</h1>
              {service.company ? (
                <p className={styles.heroCompany}>{service.company.name}</p>
              ) : null}
              <p className={styles.heroLead}>
                Tell us who is travelling and where you are going. We create a
                trip request and send it to the provider so they can confirm
                availability.
              </p>
              <ul className={styles.heroFacts}>
                {service.vehicle ? (
                  <li>
                    <Car size={14} aria-hidden="true" />
                    {service.vehicle.name}
                    {service.vehicle.plate_number
                      ? ` · ${service.vehicle.plate_number}`
                      : ""}
                  </li>
                ) : null}
                {service.vehicle ? (
                  <li>
                    <Users size={14} aria-hidden="true" />
                    Up to {service.vehicle.capacity} passengers
                  </li>
                ) : null}
                {service.vehicle ? (
                  <li>
                    <ShieldCheck size={14} aria-hidden="true" />
                    {service.vehicle.luggage_capacity} luggage bags
                  </li>
                ) : null}
                <li>
                  <CheckCircle2 size={14} aria-hidden="true" />
                  Verified driver
                </li>
              </ul>
            </div>

            <div className={styles.priceCard}>
              <span className={styles.priceLabel}>Starting price</span>
              <span className={styles.priceValue}>${service.price}</span>
              <span className={styles.priceUnit}>/ {pricingLabel}</span>
              <p className={styles.priceNote}>
                No payment now. The provider confirms the final price.
              </p>
            </div>
          </div>
        </div>
      </header>

      <div className={styles.layout}>
        <main className={styles.main}>
          <ol className={styles.progress} aria-label="Booking progress">
            {STEPS.map((step) => {
              const done = currentStep > step.id;
              const active = currentStep === step.id;
              return (
                <li
                  key={step.id}
                  className={`${styles.progressStep} ${
                    done ? styles.progressStepDone : ""
                  } ${active ? styles.progressStepActive : ""}`}
                  aria-current={active ? "step" : undefined}
                >
                  <span className={styles.progressDot}>
                    {done ? (
                      <Check size={14} aria-hidden="true" />
                    ) : (
                      step.id
                    )}
                  </span>
                  <span className={styles.progressLabel}>{step.label}</span>
                </li>
              );
            })}
          </ol>

          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <section className={styles.card} aria-labelledby="step-contact">
              <header className={styles.cardHead}>
                <span
                  className={`${styles.stepBadge} ${
                    contactComplete ? styles.stepBadgeDone : ""
                  }`}
                  aria-hidden="true"
                >
                  {contactComplete ? <Check size={17} /> : "1"}
                </span>
                <div>
                  <span className={styles.cardKicker}>Step 1 of 4</span>
                  <h2 id="step-contact" className={styles.cardTitle}>
                    Your contact details
                  </h2>
                  <p className={styles.cardLead}>
                    We use these to send the trip confirmation and keep you
                    updated. Signed-in details are filled in for you.
                  </p>
                </div>
              </header>

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
                    Phone <span aria-hidden="true">*</span>
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

                <div className={`${styles.field} ${styles.fieldFull}`}>
                  <label className={styles.label} htmlFor="booking-email">
                    Email <span aria-hidden="true">*</span>
                  </label>
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
                    value={form.email}
                    placeholder="you@example.com"
                    aria-invalid={Boolean(errors.email)}
                    onChange={(event) => update("email", event.target.value)}
                    onBlur={() => touch("email")}
                  />
                  {errors.email ? (
                    <p className={styles.errorText} role="alert">
                      {errors.email}
                    </p>
                  ) : (
                    <p className={styles.hintText}>
                      We will send your booking confirmation to this address.
                    </p>
                  )}
                </div>
              </div>
            </section>

            {contactComplete ? (
              <section className={styles.card} aria-labelledby="step-journey">
                <header className={styles.cardHead}>
                  <span
                    className={`${styles.stepBadge} ${
                      journeyComplete ? styles.stepBadgeDone : ""
                    }`}
                    aria-hidden="true"
                  >
                    {journeyComplete ? <Check size={17} /> : "2"}
                  </span>
                  <div>
                    <span className={styles.cardKicker}>Step 2 of 4</span>
                    <h2 id="step-journey" className={styles.cardTitle}>
                      Journey details
                    </h2>
                    <p className={styles.cardLead}>
                      When are you travelling, how many passengers are with you,
                      and what time should the driver arrive?
                    </p>
                  </div>
                </header>

                <div className={styles.fieldGrid}>
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
                        onClick={() =>
                          update(
                            "passengers",
                            String(Math.max(1, passengersCount - 1)),
                          )
                        }
                      >
                        −
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
                        onClick={() =>
                          update(
                            "passengers",
                            String(Math.min(maxPassengers, passengersCount + 1)),
                          )
                        }
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
                        This vehicle seats up to {maxPassengers} passengers.
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
                    ) : null}
                  </div>

                  <div className={styles.field}>
                    <label
                      className={styles.label}
                      htmlFor="booking-pickup-time"
                    >
                      Pickup time <span aria-hidden="true">*</span>
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
                      <p className={styles.hintText}>
                        Local Zanzibar time.
                      </p>
                    )}
                  </div>
                </div>
              </section>
            ) : null}

            {contactComplete && journeyComplete ? (
              <section className={styles.card} aria-labelledby="step-route">
                <header className={styles.cardHead}>
                  <span
                    className={`${styles.stepBadge} ${
                      routeComplete ? styles.stepBadgeDone : ""
                    }`}
                    aria-hidden="true"
                  >
                    {routeComplete ? <Check size={17} /> : "3"}
                  </span>
                  <div>
                    <span className={styles.cardKicker}>Step 3 of 4</span>
                    <h2 id="step-route" className={styles.cardTitle}>
                      Your route
                    </h2>
                    <p className={styles.cardLead}>
                      Start typing to see Zanzibar places, streets, hotels, and
                      beaches. Pick the closest match so we can estimate the
                      journey.
                    </p>
                  </div>
                </header>

                <div className={styles.routeFields}>
                  <PlaceAutocomplete
                    label="Pickup point"
                    name="origin"
                    value={form.origin}
                    required
                    maxLength={255}
                    placeholder="e.g. Abeid Amani Karume International Airport"
                    hint="Choose a suggestion to attach coordinates to your trip."
                    error={errors.origin}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        origin: value,
                        originLat: null,
                        originLng: null,
                      }))
                    }
                    onSelect={(place) =>
                      setForm((current) => ({
                        ...current,
                        origin: placeLabel(place),
                        originLat: place.latitude,
                        originLng: place.longitude,
                      }))
                    }
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
                        {locating ? "Locating…" : "Use my location"}
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
                      Swap
                    </button>
                  </div>

                  <PlaceAutocomplete
                    label="Destination"
                    name="destination"
                    value={form.destination}
                    required
                    maxLength={255}
                    placeholder="e.g. Kendwa Rocks Hotel"
                    error={errors.destination}
                    onChange={(value) =>
                      setForm((current) => ({
                        ...current,
                        destination: value,
                        destLat: null,
                        destLng: null,
                      }))
                    }
                    onSelect={(place) =>
                      setForm((current) => ({
                        ...current,
                        destination: placeLabel(place),
                        destLat: place.latitude,
                        destLng: place.longitude,
                      }))
                    }
                  />
                </div>

                {locationError ? (
                  <p className={styles.locationError} role="alert">
                    {locationError}
                  </p>
                ) : null}

                <div className={styles.routePreview} aria-live="polite">
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
                          Route
                        </span>
                        <span className={styles.routeMetricValue}>
                          Calculating distance…
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
                            Estimated time
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
                            Estimate
                          </span>
                          <span className={styles.routeMetricValue}>
                            {visibleRoute.source === "osrm"
                              ? "Road route"
                              : "Straight-line"}
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
                        "Select a suggestion for both points to see distance and travel time."
                      )}
                    </p>
                  )}
                </div>
              </section>
            ) : null}

            {contactComplete && journeyComplete && routeComplete ? (
              <section className={styles.card} aria-labelledby="step-notes">
                <header className={styles.cardHead}>
                  <span className={styles.stepBadge} aria-hidden="true">
                    4
                  </span>
                  <div>
                    <span className={styles.cardKicker}>Step 4 of 4</span>
                    <h2 id="step-notes" className={styles.cardTitle}>
                      Anything else we should know?
                    </h2>
                    <p className={styles.cardLead}>
                      Add optional notes for the driver, then send your trip
                      request.
                    </p>
                  </div>
                </header>

                <div className={styles.fieldGrid}>
                  <div className={`${styles.field} ${styles.fieldFull}`}>
                    <label className={styles.label} htmlFor="booking-notes">
                      Journey Notes <span aria-hidden="true">(Optional)</span>
                    </label>
                    <textarea
                      id="booking-notes"
                      className={styles.textarea}
                      name="notes"
                      rows={4}
                      maxLength={5000}
                      value={form.notes}
                      placeholder="Share additional information about your journey, luggage requirements, preferred pickup arrangements, special requests or other details..."
                      onChange={(event) => update("notes", event.target.value)}
                    />
                    <p className={styles.hintText}>
                      {form.notes.length}/5000 characters
                    </p>
                  </div>
                </div>

                {formError ? (
                  <p className={styles.alert} role="alert">
                    <AlertCircle size={17} aria-hidden="true" />
                    {formError}
                  </p>
                ) : null}

                <div className={styles.submitRow}>
                  <p className={styles.submitNote}>
                    <ShieldCheck size={16} aria-hidden="true" />
                    No payment is taken now. {providerName} confirms
                    availability and the final price before your trip.
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
                        Sending request…
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

        <aside className={styles.aside}>
          <div className={styles.summaryCard}>
            <div className={styles.summaryMedia}>
              {service.vehicle?.front_image_url ? (
                <Image
                  src={getImageUrl(service.vehicle.front_image_url)}
                  alt={service.vehicle.name}
                  fill
                  sizes="350px"
                  className={styles.summaryImage}
                  unoptimized
                />
              ) : (
                <span className={styles.summaryMediaEmpty}>
                  <Car size={30} aria-hidden="true" />
                </span>
              )}
            </div>

            <span className={styles.summaryKicker}>Private hire</span>
            <h2 className={styles.summaryTitle}>{service.title}</h2>
            {service.company ? (
              <p className={styles.summaryCompany}>{service.company.name}</p>
            ) : null}

            <div className={styles.summaryPriceRow}>
              <span className={styles.summaryPrice}>${service.price}</span>
              <span className={styles.summaryUnit}>/ {pricingLabel}</span>
            </div>

            <div className={styles.summaryList}>
              <div className={styles.summaryRow}>
                <MapPin size={15} aria-hidden="true" />
                <span className={styles.summaryRowText}>
                  <span className={styles.summaryRowLabel}>Route</span>
                  <span className={styles.summaryRowValue}>
                    {routeComplete
                      ? `${form.origin} → ${form.destination}`
                      : "Choose your pickup point and destination"}
                  </span>
                </span>
              </div>

              <div className={styles.summaryRow}>
                <CalendarDays size={15} aria-hidden="true" />
                <span className={styles.summaryRowText}>
                  <span className={styles.summaryRowLabel}>Date</span>
                  <span className={styles.summaryRowValue}>
                    {travelDateValid
                      ? formatFormDate(form.travel_date)
                      : "Not selected"}
                  </span>
                </span>
              </div>

              <div className={styles.summaryRow}>
                <Clock size={15} aria-hidden="true" />
                <span className={styles.summaryRowText}>
                  <span className={styles.summaryRowLabel}>Pickup</span>
                  <span className={styles.summaryRowValue}>
                    {pickupTimeValid ? form.pickup_time : "Not selected"}
                  </span>
                </span>
              </div>

              <div className={styles.summaryRow}>
                <Users size={15} aria-hidden="true" />
                <span className={styles.summaryRowText}>
                  <span className={styles.summaryRowLabel}>Passengers</span>
                  <span className={styles.summaryRowValue}>
                    {passengersValid ? form.passengers : "Not selected"}
                  </span>
                </span>
              </div>

              {visibleRoute ? (
                <div className={styles.summaryRow}>
                  <RouteIcon size={15} aria-hidden="true" />
                  <span className={styles.summaryRowText}>
                    <span className={styles.summaryRowLabel}>Journey</span>
                    <span className={styles.summaryRowValue}>
                      {formatDistance(visibleRoute.distanceKm)} ·{" "}
                      {formatDuration(visibleRoute.durationMins)}
                    </span>
                  </span>
                </div>
              ) : null}

              <div className={styles.summaryRow}>
                <Car size={15} aria-hidden="true" />
                <span className={styles.summaryRowText}>
                  <span className={styles.summaryRowLabel}>Vehicle</span>
                  <span className={styles.summaryRowValue}>
                    {service.vehicle
                      ? `${service.vehicle.name} · ${driverName}`
                      : driverName}
                  </span>
                </span>
              </div>
            </div>

            <p className={styles.summaryNote}>
              Your request creates a trip. {providerName} confirms
              availability before the journey.
            </p>
          </div>

          <div className={styles.helpCard}>
            <h2 className={styles.helpTitle}>Need help?</h2>
            <p className={styles.helpText}>
              {service.company?.contact_phone || service.driver?.phone
                ? "Call the provider directly if you have questions about this vehicle."
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
        </aside>
      </div>
    </div>
  );
}
