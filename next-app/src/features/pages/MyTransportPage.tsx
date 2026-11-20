"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CalendarDays,
  Car,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  Loader2,
  Navigation,
  Phone,
  RefreshCw,
  Route as RouteIcon,
  ShieldCheck,
  Star,
  UserCheck,
  Users,
  X,
  XCircle,
} from "lucide-react";
import {
  transportBookingsAPI,
  transportReviewsAPI,
  transportTripRequestsAPI,
} from "@/lib/api/client";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { PageHero } from "@/components/PageHero";
import { getImageUrl } from "@/lib/utils/image-url";
import styles from "@/features/pages/my-transport.module.css";

type TransportBookingItem = {
  id: number;
  reference: string | null;
  status: string;
  travel_date: string;
  pickup_time: string | null;
  passengers: number;
  total_price: string | null;
  notes: string | null;
  origin: string | null;
  destination: string | null;
  distance_km: number | null;
  duration_mins: number | null;
  trip_request_id: number | null;
  trip: {
    id: number;
    origin?: string | null;
    destination?: string | null;
    pickup_time?: string | null;
    distance_km?: number | null;
    duration_mins?: number | null;
    status?: string;
  } | null;
  service: {
    id: number;
    title: string;
    pricing_type?: string;
    vehicle: {
      name: string;
      plate_number?: string | null;
      category?: string;
      front_image_url?: string | null;
    } | null;
    driver: {
      name: string;
      phone?: string | null;
    } | null;
    company: {
      name: string;
      slug: string;
      contact_phone?: string | null;
    } | null;
  } | null;
  vehicle: {
    name: string;
    plate_number?: string | null;
    front_image_url?: string | null;
  } | null;
  driver: {
    name: string;
    phone?: string | null;
  } | null;
  company: {
    name: string;
    slug: string;
    contact_phone?: string | null;
  } | null;
};

type CustomTripRequestItem = {
  id: number;
  origin: string;
  destination: string;
  travel_date?: string | null;
  travelDate?: string | null;
  pickup_time?: string | null;
  pickupTime?: string | null;
  passengers: number;
  luggage?: number;
  distance_km?: number | null;
  distanceKm?: number | null;
  duration_mins?: number | null;
  durationMins?: number | null;
  notes?: string | null;
  status: string;
  bookings?: { id: number }[];
  driver?: {
    name: string;
    phone?: string | null;
  } | null;
};

type StatusFilter = "all" | "active" | "completed" | "cancelled";

const STATUS_META: Record<
  string,
  { label: string; hint: string }
> = {
  pending: {
    label: "Pending review",
    hint: "Waiting for provider confirmation and pickup assignment.",
  },
  confirmed: {
    label: "Confirmed",
    hint: "Confirmed — your driver will meet you at the scheduled pickup point.",
  },
  in_progress: {
    label: "In progress",
    hint: "Your private hire trip is currently underway.",
  },
  completed: {
    label: "Completed",
    hint: "Journey finished. Share a quick review to help other travelers.",
  },
  cancelled: {
    label: "Cancelled",
    hint: "This booking request has been cancelled.",
  },
  requested: {
    label: "Open request",
    hint: "Available to approved public hire drivers.",
  },
  quoted: {
    label: "Quoted",
    hint: "A quote has been prepared for your route.",
  },
  accepted: {
    label: "Driver accepted",
    hint: "An approved driver has claimed your trip and will contact you.",
  },
};

function formatTravelDate(value: string | null | undefined) {
  if (!value) return "Date pending";
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

function formatDuration(minutes: number | null | undefined) {
  if (minutes == null || !Number.isFinite(minutes)) return "";
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function formatDistance(km: number | null | undefined) {
  if (km == null || !Number.isFinite(km)) return "";
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

function statusClassName(status: string): string {
  const key = `status_${status}` as keyof typeof styles;
  return styles[key] ?? styles.status_pending;
}

export default function MyTransportPage() {
  const toast = useToast();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();

  const [bookings, setBookings] = useState<TransportBookingItem[]>([]);
  const [requests, setRequests] = useState<CustomTripRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [confirmCancelId, setConfirmCancelId] = useState<number | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBooking, setReviewBooking] = useState<TransportBookingItem | null>(
    null,
  );
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const fetchTransportData = useCallback(async () => {
    const [bRes, rRes] = await Promise.all([
      transportBookingsAPI.getAll().catch(() => ({ data: [] })),
      transportTripRequestsAPI.getAll().catch(() => ({ data: [] })),
    ]);

    const nextBookings: TransportBookingItem[] = Array.isArray(bRes.data)
      ? bRes.data
      : bRes.data?.results || [];
    const rawRequests: CustomTripRequestItem[] = Array.isArray(rRes.data)
      ? rRes.data
      : rRes.data?.results || [];

    // Trip-first bookings create a linked trip request. Keep the booking as
    // the single visible record instead of showing the same journey twice.
    const standaloneRequests = rawRequests.filter(
      (request) => !Array.isArray(request.bookings) || request.bookings.length === 0,
    );

    return { nextBookings, standaloneRequests };
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.replace("/login/?from=%2Fmy-transport%2F");
      return;
    }

    let active = true;
    fetchTransportData()
      .then(({ nextBookings, standaloneRequests }) => {
        if (!active) return;
        setBookings(nextBookings);
        setRequests(standaloneRequests);
      })
      .catch((err: unknown) => {
        if (!active) return;
        const msg = err instanceof Error ? err.message : "Failed to load transport trips";
        toast.error(msg);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [authLoading, fetchTransportData, isAuthenticated, router, toast]);

  useEffect(() => {
    if (!reviewOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setReviewOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [reviewOpen]);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const { nextBookings, standaloneRequests } = await fetchTransportData();
      setBookings(nextBookings);
      setRequests(standaloneRequests);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Could not refresh transport trips";
      toast.error(msg);
    } finally {
      setRefreshing(false);
    }
  };

  const cancelBooking = async (id: number) => {
    setCancellingId(id);
    try {
      await transportBookingsAPI.cancel(id);
      setBookings((current) =>
        current.map((booking) =>
          booking.id === id ? { ...booking, status: "cancelled" } : booking,
        ),
      );
      setConfirmCancelId(null);
      toast.success("Booking request cancelled.");
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message || "Could not cancel this booking request.";
      toast.error(message);
    } finally {
      setCancellingId(null);
    }
  };

  const openReview = (booking: TransportBookingItem) => {
    setReviewBooking(booking);
    setReviewRating(5);
    setReviewContent("");
    setReviewOpen(true);
  };

  const submitReview = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!reviewBooking) return;
    try {
      setReviewSubmitting(true);
      await transportReviewsAPI.create({
        transport_booking_id: reviewBooking.id,
        rating: String(reviewRating),
        content: reviewContent.trim(),
      });
      toast.success("Review submitted for moderation.");
      setReviewOpen(false);
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ||
        (err instanceof Error ? err.message : "Failed to submit review.");
      toast.error(message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  const activeBookingsCount = useMemo(
    () =>
      bookings.filter((b) =>
        ["pending", "confirmed", "in_progress"].includes(b.status),
      ).length,
    [bookings],
  );
  const completedBookingsCount = useMemo(
    () => bookings.filter((b) => b.status === "completed").length,
    [bookings],
  );
  const cancelledBookingsCount = useMemo(
    () => bookings.filter((b) => b.status === "cancelled").length,
    [bookings],
  );

  const filteredBookings = useMemo(() => {
    if (filter === "all") return bookings;
    if (filter === "active") {
      return bookings.filter((b) =>
        ["pending", "confirmed", "in_progress"].includes(b.status),
      );
    }
    if (filter === "completed") {
      return bookings.filter((b) => b.status === "completed");
    }
    return bookings.filter((b) => b.status === "cancelled");
  }, [bookings, filter]);

  return (
    <div id="my-transport-root" className={`page ${styles.page}`}>
      <PageHero
        eyebrow="My Transport"
        title="Track your bookings and trip requests"
        subtitle="Review routes, schedules, assigned vehicles, and live status updates for your private hire trips."
        backgroundImageKey="feature"
        patternImageKey="thumb"
        ctaPrimary={{ label: "Book private hire", href: "/transport/" }}
        ctaSecondary={{ label: "Request custom trip", href: "/trip-request/" }}
      />

      <div className={styles.content}>
        {/* KPI Summary Strip */}
        <section className={styles.statsGrid} aria-label="Transport summary">
          <article className={styles.statCard}>
            <span className={styles.statIcon} aria-hidden="true">
              <Car size={20} />
            </span>
            <div className={styles.statCopy}>
              <span className={styles.statLabel}>Private hire bookings</span>
              <strong className={styles.statValue}>
                {loading ? "—" : bookings.length}
              </strong>
              <span className={styles.statSub}>
                {bookings.length === 1 ? "Booked vehicle trip" : "Booked vehicle trips"}
              </span>
            </div>
          </article>

          <article className={styles.statCard}>
            <span
              className={`${styles.statIcon} ${styles.statIconAmber}`}
              aria-hidden="true"
            >
              <Clock size={20} />
            </span>
            <div className={styles.statCopy}>
              <span className={styles.statLabel}>Active &amp; pending</span>
              <strong className={styles.statValue}>
                {loading ? "—" : activeBookingsCount}
              </strong>
              <span className={styles.statSub}>Awaiting or upcoming journeys</span>
            </div>
          </article>

          <article className={styles.statCard}>
            <span
              className={`${styles.statIcon} ${styles.statIconEmerald}`}
              aria-hidden="true"
            >
              <ClipboardList size={20} />
            </span>
            <div className={styles.statCopy}>
              <span className={styles.statLabel}>Custom trip requests</span>
              <strong className={styles.statValue}>
                {loading ? "—" : requests.length}
              </strong>
              <span className={styles.statSub}>Open public driver requests</span>
            </div>
          </article>
        </section>

        {/* SECTION 1: Private Hire Bookings */}
        <section className={styles.section} aria-labelledby="private-hire-heading">
          <header className={styles.sectionHead}>
            <div className={styles.sectionTitleGroup}>
              <span className={styles.sectionEyebrow}>
                <Car size={13} aria-hidden="true" />
                Booked vehicles
              </span>
              <div className={styles.sectionTitleRow}>
                <h2 id="private-hire-heading" className={styles.sectionTitle}>
                  Private Hire Bookings
                </h2>
                {!loading ? (
                  <span className={styles.countBadge}>
                    {filteredBookings.length}{" "}
                    {filteredBookings.length === 1 ? "booking" : "bookings"}
                  </span>
                ) : null}
              </div>
            </div>

            <div className={styles.sectionTools}>
              {bookings.length > 0 ? (
                <div className={styles.filterGroup} role="group" aria-label="Filter bookings">
                  {(
                    [
                      { id: "all", label: `All (${bookings.length})` },
                      { id: "active", label: `Active (${activeBookingsCount})` },
                      ...(completedBookingsCount > 0
                        ? [{ id: "completed" as const, label: `Completed (${completedBookingsCount})` }]
                        : []),
                      ...(cancelledBookingsCount > 0
                        ? [{ id: "cancelled" as const, label: `Cancelled (${cancelledBookingsCount})` }]
                        : []),
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={`${styles.filterChip} ${
                        filter === item.id ? styles.filterChipActive : ""
                      }`}
                      aria-pressed={filter === item.id}
                      onClick={() => setFilter(item.id)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              ) : null}

              <button
                type="button"
                className={styles.refreshButton}
                disabled={loading || refreshing}
                onClick={() => void handleRefresh()}
              >
                <RefreshCw
                  size={14}
                  className={refreshing ? styles.spin : ""}
                  aria-hidden="true"
                />
                {refreshing ? "Refreshing…" : "Refresh"}
              </button>
            </div>
          </header>

          {loading ? (
            <div className={styles.cardList} aria-busy="true" aria-label="Loading bookings">
              {[0, 1].map((index) => (
                <div key={index} className={styles.skeletonCard}>
                  <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonRoute}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonMeta}`} />
                </div>
              ))}
            </div>
          ) : bookings.length === 0 ? (
            <div className={styles.emptyCard}>
              <span className={styles.emptyIcon} aria-hidden="true">
                <Car size={24} />
              </span>
              <h3 className={styles.emptyTitle}>No private hire bookings yet</h3>
              <p className={styles.emptyCopy}>
                Choose a verified vehicle and driver, pick your Zanzibar origin
                and destination, and your booked trips will appear here.
              </p>
              <Link href="/transport/" className={styles.emptyCta}>
                Browse private hire services
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className={styles.emptyCard}>
              <span className={styles.emptyIcon} aria-hidden="true">
                <CheckCircle2 size={24} />
              </span>
              <h3 className={styles.emptyTitle}>No bookings in this view</h3>
              <p className={styles.emptyCopy}>
                Switch back to All bookings to view every private hire request
                on your account.
              </p>
              <button
                type="button"
                className={styles.reviewButton}
                onClick={() => setFilter("all")}
              >
                Show all bookings
              </button>
            </div>
          ) : (
            <div className={styles.cardList}>
              {filteredBookings.map((booking) => {
                const trip = booking.trip ?? booking;
                const origin = trip.origin ?? booking.origin;
                const destination = trip.destination ?? booking.destination;
                const pickupTime = trip.pickup_time ?? booking.pickup_time;
                const distance = formatDistance(
                  trip.distance_km ?? booking.distance_km,
                );
                const duration = formatDuration(
                  trip.duration_mins ?? booking.duration_mins,
                );
                const journey = [distance, duration].filter(Boolean).join(" · ");
                const vehicle = booking.vehicle ?? booking.service?.vehicle;
                const driver = booking.driver ?? booking.service?.driver;
                const company = booking.service?.company ?? booking.company;
                const tripId = booking.trip?.id ?? booking.trip_request_id;
                const meta = STATUS_META[booking.status] ?? {
                  label: booking.status.replaceAll("_", " "),
                  hint: "Status updated by provider.",
                };
                const isConfirmingCancel = confirmCancelId === booking.id;
                const isCancelling = cancellingId === booking.id;

                return (
                  <article
                    key={booking.id}
                    className={`${styles.bookingCard} ${
                      booking.status === "cancelled"
                        ? styles.bookingCardCancelled
                        : ""
                    }`}
                  >
                    {/* Top Row: Identity + Status & Price */}
                    <div className={styles.cardTop}>
                      <div className={styles.cardIdentity}>
                        <div className={styles.vehicleThumb}>
                          {vehicle?.front_image_url ? (
                            <Image
                              src={getImageUrl(vehicle.front_image_url)}
                              alt={vehicle.name}
                              fill
                              sizes="60px"
                              className={styles.vehicleThumbImg}
                              unoptimized
                            />
                          ) : (
                            <Car size={24} aria-hidden="true" />
                          )}
                        </div>
                        <div className={styles.identityCopy}>
                          <div className={styles.badgeRow}>
                            {booking.reference ? (
                              <span className={styles.refBadge}>
                                {booking.reference}
                              </span>
                            ) : (
                              <span className={styles.refBadge}>
                                #{booking.id}
                              </span>
                            )}
                            {tripId ? (
                              <span className={styles.tripTag}>
                                <RouteIcon size={11} aria-hidden="true" />
                                TRIP-{tripId}
                              </span>
                            ) : null}
                          </div>
                          <h3 className={styles.serviceTitle}>
                            {booking.service?.title || "Private hire trip"}
                          </h3>
                          {company?.name ? (
                            <p className={styles.companyMeta}>{company.name}</p>
                          ) : null}
                        </div>
                      </div>

                      <div className={styles.cardPriceStatus}>
                        <span
                          className={`${styles.statusBadge} ${statusClassName(
                            booking.status,
                          )}`}
                        >
                          <span className={styles.statusDot} aria-hidden="true" />
                          {meta.label}
                        </span>
                        {booking.total_price ? (
                          <div className={styles.priceDisplay}>
                            <span className={styles.priceAmount}>
                              ${booking.total_price}
                            </span>
                            {booking.service?.pricing_type ? (
                              <span className={styles.priceUnit}>
                                /{" "}
                                {booking.service.pricing_type.replaceAll(
                                  "_",
                                  " ",
                                )}
                              </span>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Trip Route Strip (A -> B) */}
                    {origin || destination ? (
                      <div className={styles.routePanel}>
                        <div className={styles.routeStops}>
                          <div className={styles.routeStop}>
                            <span
                              className={`${styles.stopPin} ${styles.stopPinOrigin}`}
                              aria-hidden="true"
                            >
                              A
                            </span>
                            <div className={styles.stopText}>
                              <span className={styles.stopKind}>Origin</span>
                              <span className={styles.stopAddress}>
                                {origin || "Pickup point"}
                              </span>
                            </div>
                          </div>
                          <span className={styles.stopRail} aria-hidden="true" />
                          <div className={styles.routeStop}>
                            <span
                              className={`${styles.stopPin} ${styles.stopPinDest}`}
                              aria-hidden="true"
                            >
                              B
                            </span>
                            <div className={styles.stopText}>
                              <span className={styles.stopKind}>Destination</span>
                              <span className={styles.stopAddress}>
                                {destination || "Drop-off point"}
                              </span>
                            </div>
                          </div>
                        </div>

                        {journey ? (
                          <div className={styles.routeMetricsPill}>
                            <Navigation size={14} aria-hidden="true" />
                            <span>{journey}</span>
                          </div>
                        ) : null}
                      </div>
                    ) : null}

                    {/* Structured Schedule & Vehicle Details */}
                    <div className={styles.metaGrid}>
                      <div className={styles.metaCell}>
                        <CalendarDays size={16} aria-hidden="true" />
                        <div className={styles.metaText}>
                          <span className={styles.metaLabel}>Travel date</span>
                          <span className={styles.metaValue}>
                            {formatTravelDate(booking.travel_date)}
                          </span>
                        </div>
                      </div>

                      <div className={styles.metaCell}>
                        <Clock size={16} aria-hidden="true" />
                        <div className={styles.metaText}>
                          <span className={styles.metaLabel}>Pickup time</span>
                          <span className={styles.metaValue}>
                            {pickupTime || "To be arranged"}
                          </span>
                        </div>
                      </div>

                      <div className={styles.metaCell}>
                        <Users size={16} aria-hidden="true" />
                        <div className={styles.metaText}>
                          <span className={styles.metaLabel}>Passengers</span>
                          <span className={styles.metaValue}>
                            {booking.passengers}{" "}
                            {booking.passengers === 1 ? "passenger" : "passengers"}
                          </span>
                        </div>
                      </div>

                      <div className={styles.metaCell}>
                        <Car size={16} aria-hidden="true" />
                        <div className={styles.metaText}>
                          <span className={styles.metaLabel}>Vehicle</span>
                          <span className={styles.metaValue}>
                            {vehicle?.name || "Assigned vehicle"}
                          </span>
                          {vehicle?.plate_number ? (
                            <span className={styles.plateChip}>
                              {vehicle.plate_number}
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    {driver &&
                    ["confirmed", "in_progress"].includes(booking.status) ? (
                      <div className={styles.driverBar}>
                        <span className={styles.badgeRow}>
                          <UserCheck size={15} aria-hidden="true" />
                          Driver: <strong>{driver.name}</strong>
                        </span>
                        {driver.phone ? (
                          <a href={`tel:${driver.phone.replace(/\D/g, "")}`}>
                            <Phone size={14} aria-hidden="true" />
                            {driver.phone}
                          </a>
                        ) : null}
                      </div>
                    ) : null}

                    {booking.notes?.trim() ? (
                      <p className={styles.notesBox}>{booking.notes}</p>
                    ) : null}

                    {/* Footer Actions */}
                    <footer className={styles.cardFooter}>
                      <span className={styles.footerHint}>
                        <ShieldCheck size={15} aria-hidden="true" />
                        {meta.hint}
                      </span>

                      <div className={styles.footerActions}>
                        {booking.service?.id ? (
                          <Link
                            href={`/transport/service/${booking.service.id}/`}
                            className={styles.actionLink}
                          >
                            <ExternalLink size={14} aria-hidden="true" />
                            View vehicle
                          </Link>
                        ) : null}

                        {company?.contact_phone &&
                        booking.status !== "cancelled" ? (
                          <a
                            href={`tel:${company.contact_phone.replace(/\D/g, "")}`}
                            className={styles.actionLink}
                          >
                            <Phone size={14} aria-hidden="true" />
                            Call provider
                          </a>
                        ) : null}

                        {booking.status === "pending" ? (
                          isConfirmingCancel ? (
                            <>
                              <button
                                type="button"
                                className={styles.keepButton}
                                disabled={isCancelling}
                                onClick={() => setConfirmCancelId(null)}
                              >
                                Keep booking
                              </button>
                              <button
                                type="button"
                                className={styles.confirmCancelButton}
                                disabled={isCancelling}
                                onClick={() => void cancelBooking(booking.id)}
                              >
                                {isCancelling ? (
                                  <>
                                    <Loader2
                                      size={14}
                                      className={styles.spin}
                                      aria-hidden="true"
                                    />
                                    Cancelling…
                                  </>
                                ) : (
                                  <>
                                    <XCircle size={14} aria-hidden="true" />
                                    Confirm cancel
                                  </>
                                )}
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              className={styles.cancelButton}
                              onClick={() => setConfirmCancelId(booking.id)}
                            >
                              <XCircle size={14} aria-hidden="true" />
                              Cancel request
                            </button>
                          )
                        ) : null}

                        {booking.status === "completed" ? (
                          <button
                            type="button"
                            className={styles.reviewButton}
                            onClick={() => openReview(booking)}
                          >
                            <Star size={14} aria-hidden="true" />
                            Leave review
                          </button>
                        ) : null}
                      </div>
                    </footer>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* SECTION 2: Custom Trip Requests */}
        <section className={styles.section} aria-labelledby="custom-requests-heading">
          <header className={styles.sectionHead}>
            <div className={styles.sectionTitleGroup}>
              <span className={styles.sectionEyebrow}>
                <ClipboardList size={13} aria-hidden="true" />
                Open driver network
              </span>
              <div className={styles.sectionTitleRow}>
                <h2 id="custom-requests-heading" className={styles.sectionTitle}>
                  Custom Trip Requests
                </h2>
                {!loading ? (
                  <span className={styles.countBadge}>
                    {requests.length}{" "}
                    {requests.length === 1 ? "request" : "requests"}
                  </span>
                ) : null}
              </div>
            </div>
          </header>

          {loading ? null : requests.length === 0 ? (
            <div className={styles.emptyCard}>
              <span className={styles.emptyIcon} aria-hidden="true">
                <ClipboardList size={24} />
              </span>
              <h3 className={styles.emptyTitle}>No custom trip requests yet</h3>
              <p className={styles.emptyCopy}>
                Want approved independent drivers across Zanzibar to respond to
                a custom itinerary? Post a custom trip request anytime.
              </p>
              <Link href="/trip-request/" className={styles.emptyCta}>
                Create a custom trip request
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          ) : (
            <div className={styles.cardList}>
              {requests.map((request) => {
                const travelDate = request.travel_date ?? request.travelDate;
                const pickupTime = request.pickup_time ?? request.pickupTime;
                const journey = [
                  formatDistance(request.distance_km ?? request.distanceKm),
                  formatDuration(request.duration_mins ?? request.durationMins),
                ]
                  .filter(Boolean)
                  .join(" · ");
                const meta = STATUS_META[request.status] ?? {
                  label: request.status.replaceAll("_", " "),
                  hint: "Custom trip request.",
                };

                return (
                  <article key={request.id} className={styles.bookingCard}>
                    <div className={styles.cardTop}>
                      <div className={styles.cardIdentity}>
                        <div className={styles.vehicleThumb}>
                          <Navigation size={22} aria-hidden="true" />
                        </div>
                        <div className={styles.identityCopy}>
                          <div className={styles.badgeRow}>
                            <span className={styles.refBadge}>
                              REQ-{request.id}
                            </span>
                          </div>
                          <h3 className={styles.serviceTitle}>
                            {request.origin} → {request.destination}
                          </h3>
                        </div>
                      </div>

                      <div className={styles.cardPriceStatus}>
                        <span
                          className={`${styles.statusBadge} ${statusClassName(
                            request.status,
                          )}`}
                        >
                          <span className={styles.statusDot} aria-hidden="true" />
                          {meta.label}
                        </span>
                      </div>
                    </div>

                    <div className={styles.routePanel}>
                      <div className={styles.routeStops}>
                        <div className={styles.routeStop}>
                          <span
                            className={`${styles.stopPin} ${styles.stopPinOrigin}`}
                            aria-hidden="true"
                          >
                            A
                          </span>
                          <div className={styles.stopText}>
                            <span className={styles.stopKind}>Origin</span>
                            <span className={styles.stopAddress}>
                              {request.origin}
                            </span>
                          </div>
                        </div>
                        <span className={styles.stopRail} aria-hidden="true" />
                        <div className={styles.routeStop}>
                          <span
                            className={`${styles.stopPin} ${styles.stopPinDest}`}
                            aria-hidden="true"
                          >
                            B
                          </span>
                          <div className={styles.stopText}>
                            <span className={styles.stopKind}>Destination</span>
                            <span className={styles.stopAddress}>
                              {request.destination}
                            </span>
                          </div>
                        </div>
                      </div>

                      {journey ? (
                        <div className={styles.routeMetricsPill}>
                          <Navigation size={14} aria-hidden="true" />
                          <span>{journey}</span>
                        </div>
                      ) : null}
                    </div>

                    <div className={styles.metaGrid}>
                      <div className={styles.metaCell}>
                        <CalendarDays size={16} aria-hidden="true" />
                        <div className={styles.metaText}>
                          <span className={styles.metaLabel}>Travel date</span>
                          <span className={styles.metaValue}>
                            {formatTravelDate(travelDate)}
                          </span>
                        </div>
                      </div>

                      <div className={styles.metaCell}>
                        <Clock size={16} aria-hidden="true" />
                        <div className={styles.metaText}>
                          <span className={styles.metaLabel}>Pickup time</span>
                          <span className={styles.metaValue}>
                            {pickupTime || "Flexible"}
                          </span>
                        </div>
                      </div>

                      <div className={styles.metaCell}>
                        <Users size={16} aria-hidden="true" />
                        <div className={styles.metaText}>
                          <span className={styles.metaLabel}>Passengers</span>
                          <span className={styles.metaValue}>
                            {request.passengers}{" "}
                            {request.passengers === 1 ? "passenger" : "passengers"}
                          </span>
                        </div>
                      </div>

                      <div className={styles.metaCell}>
                        <ClipboardList size={16} aria-hidden="true" />
                        <div className={styles.metaText}>
                          <span className={styles.metaLabel}>Luggage</span>
                          <span className={styles.metaValue}>
                            {request.luggage ?? 0}{" "}
                            {(request.luggage ?? 0) === 1 ? "bag" : "bags"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {request.notes?.trim() ? (
                      <p className={styles.notesBox}>{request.notes}</p>
                    ) : null}

                    {request.driver ? (
                      <div className={styles.driverBar}>
                        <span className={styles.badgeRow}>
                          <UserCheck size={15} aria-hidden="true" />
                          Accepted by <strong>{request.driver.name}</strong>
                        </span>
                        {request.driver.phone ? (
                          <a href={`tel:${request.driver.phone.replace(/\D/g, "")}`}>
                            <Phone size={14} aria-hidden="true" />
                            {request.driver.phone}
                          </a>
                        ) : null}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Review Modal */}
      {reviewOpen && reviewBooking ? (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="review-modal-title"
          onClick={() => setReviewOpen(false)}
        >
          <div
            className={styles.modalCard}
            onClick={(event) => event.stopPropagation()}
          >
            <header className={styles.modalHead}>
              <div>
                <h2 id="review-modal-title" className={styles.modalTitle}>
                  Leave a review
                </h2>
                <p className={styles.modalSub}>
                  {reviewBooking.service?.title || "Private hire trip"}
                  {reviewBooking.reference ? ` · ${reviewBooking.reference}` : ""}
                </p>
              </div>
              <button
                type="button"
                className={styles.modalClose}
                aria-label="Close review modal"
                onClick={() => setReviewOpen(false)}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </header>

            <form onSubmit={submitReview} className={styles.modalForm}>
              <div className={styles.modalField}>
                <span className={styles.modalLabel}>Your rating</span>
                <div className={styles.starRow} role="radiogroup" aria-label="Rating">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={reviewRating === value}
                      aria-label={`${value} ${value === 1 ? "star" : "stars"}`}
                      className={`${styles.starButton} ${
                        value <= reviewRating ? styles.starButtonActive : ""
                      }`}
                      onClick={() => setReviewRating(value)}
                    >
                      <Star
                        size={19}
                        fill={value <= reviewRating ? "currentColor" : "none"}
                        aria-hidden="true"
                      />
                    </button>
                  ))}
                  <span className={styles.starLabel}>{reviewRating} / 5</span>
                </div>
              </div>

              <div className={styles.modalField}>
                <label className={styles.modalLabel} htmlFor="transport-review-text">
                  Your experience
                </label>
                <textarea
                  id="transport-review-text"
                  required
                  rows={4}
                  placeholder="Share how the pickup, driver, vehicle comfort, and journey went…"
                  value={reviewContent}
                  onChange={(event) => setReviewContent(event.target.value)}
                  className={styles.modalTextarea}
                />
              </div>

              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.keepButton}
                  onClick={() => setReviewOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={reviewSubmitting}
                  className={styles.modalSubmit}
                >
                  {reviewSubmitting ? (
                    <>
                      <Loader2
                        size={15}
                        className={styles.spin}
                        aria-hidden="true"
                      />
                      Submitting…
                    </>
                  ) : (
                    "Submit review"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
