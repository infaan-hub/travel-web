"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  DollarSign,
  Building2,
  CalendarDays,
  Car,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Compass,
  Flag,
  LayoutDashboard,
  LoaderCircle,
  Mail,
  MapPin,
  MessageCircle,
  Navigation,
  Phone,
  ShieldCheck,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { driverAPI } from "@/lib/api/client";
import {
  DRIVER_STAGE_LABELS,
  DRIVER_STAGE_ORDER,
  driverStageRoute,
  formatDistanceLabel,
  formatDurationLabel,
  isActiveExecutionStage,
  resolveDriverStage,
  stageStepIndex,
  type ActiveDriverPageStage,
} from "@/lib/driver-workflow";
import {
  formatClockTime,
  formatPhoneHref,
  formatShortDate,
  formatWhatsAppHref,
  personInitials,
  type DriverBookingRecord,
} from "@/features/driver/driver-types";
import DriverLiveRouteMap, {
  type LiveDriverTelemetry,
  type LiveRouteSummary,
} from "@/components/DriverLiveRouteMap";
import { useToast } from "@/components/ToastProvider";
import styles from "@/features/pages/driver-workspace.module.css";

type Props = {
  pageStage: ActiveDriverPageStage;
  driverName: string;
  companyName: string;
};

const PAGE_STEP_INDEX: Record<ActiveDriverPageStage, number> = {
  start: 0,
  pickup: 1,
  trip: 2,
  finalize: 3,
};

export default function DriverTripStagePage({ pageStage, driverName, companyName }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const bookingIdParam = searchParams.get("booking");
  const [booking, setBooking] = useState<DriverBookingRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [completedDone, setCompletedDone] = useState(false);
  const [driverNotes, setDriverNotes] = useState("");
  const [liveRoute, setLiveRoute] = useState<LiveRouteSummary | null>(null);
  const latestPosRef = useRef<LiveDriverTelemetry | null>(null);

  const loadBooking = useCallback(async () => {
    setLoading(true);
    try {
      if (bookingIdParam && /^\d+$/.test(bookingIdParam)) {
        const res = await driverAPI.getBooking(bookingIdParam);
        const found = res.data as DriverBookingRecord;
        setBooking(found);
        setDriverNotes(found.driver_notes ?? "");
        if (found.status === "completed") setCompletedDone(true);
        return;
      }

      // Fallback when visiting /driver/start|pickup|trip|finalize/ without ?booking=
      const listRes = await driverAPI.getBookings();
      const all = (listRes.data?.bookings ?? []) as DriverBookingRecord[];
      const targetStage = DRIVER_STAGE_ORDER[PAGE_STEP_INDEX[pageStage]].stage;
      const matched =
        all.find((item) => resolveDriverStage(item) === targetStage) ??
        all.find((item) => isActiveExecutionStage(resolveDriverStage(item))) ??
        null;
      setBooking(matched);
      if (matched) {
        setDriverNotes(matched.driver_notes ?? "");
        if (matched.status === "completed") setCompletedDone(true);
      }
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Could not load the active trip.");
      setBooking(null);
    } finally {
      setLoading(false);
    }
  }, [bookingIdParam, pageStage, toast]);

  useEffect(() => {
    void loadBooking(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [loadBooking]);

  const currentStage = useMemo(
    () => (booking ? resolveDriverStage(booking) : null),
    [booking],
  );
  const currentStepIdx = currentStage ? stageStepIndex(currentStage) : -1;
  const viewStepIdx = PAGE_STEP_INDEX[pageStage];

  const handlePositionUpdate = useCallback((pos: LiveDriverTelemetry) => {
    latestPosRef.current = pos;
  }, []);

  const handleRouteMetrics = useCallback((metrics: LiveRouteSummary) => {
    setLiveRoute(metrics);
  }, []);

  const handleArrived = async () => {
    if (!booking) return;
    setSubmitting(true);
    try {
      const pos = latestPosRef.current;
      await driverAPI.transitionBooking(booking.id, {
        action: "arrived",
        ...(pos ? { lat: pos.lat, lng: pos.lng } : {}),
      });
      toast.success("Arrival confirmed! Customer & company notified.");
      router.push(`/driver/pickup/?booking=${booking.id}`);
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Could not mark arrival.");
      setSubmitting(false);
    }
  };

  const handlePickedUp = async () => {
    if (!booking) return;
    setSubmitting(true);
    try {
      const pos = latestPosRef.current;
      await driverAPI.transitionBooking(booking.id, {
        action: "picked_up",
        ...(pos ? { lat: pos.lat, lng: pos.lng } : {}),
      });
      toast.success("Customer picked up! Live trip to destination started.");
      router.push(`/driver/trip/?booking=${booking.id}`);
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Could not mark customer picked up.");
      setSubmitting(false);
    }
  };

  const handleReachedDestination = async () => {
    if (!booking) return;
    setSubmitting(true);
    try {
      const pos = latestPosRef.current;
      await driverAPI.transitionBooking(booking.id, {
        action: "reached_destination",
        ...(pos ? { lat: pos.lat, lng: pos.lng } : {}),
      });
      toast.success("Destination reached! Review details to finalize.");
      router.push(`/driver/finalize/?booking=${booking.id}`);
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Could not update destination status.");
      setSubmitting(false);
    }
  };

  const handleFinalizeTrip = async () => {
    if (!booking) return;
    setSubmitting(true);
    try {
      const pos = latestPosRef.current;
      const res = await driverAPI.transitionBooking(booking.id, {
        action: "finalize",
        notes: driverNotes.trim(),
        ...(pos ? { lat: pos.lat, lng: pos.lng } : {}),
      });
      setBooking((current) =>
        current ? ({ ...current, ...(res.data ?? {}) } as DriverBookingRecord) : current,
      );
      setCompletedDone(true);
      toast.success("Trip finalized and completed! Customer & company notified.");
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Could not finalize this trip.");
    } finally {
      setSubmitting(false);
    }
  };

  const vehicle = booking?.vehicle ?? booking?.service?.vehicle ?? null;
  const customer = booking?.customer_account;
  const displayName = customer?.full_name || booking?.full_name || "Customer";
  const displayPhone = customer?.phone || booking?.phone || "";
  const displayEmail = customer?.email || booking?.email || "";
  const telHref = formatPhoneHref(displayPhone);
  const waHref = formatWhatsAppHref(
    displayPhone,
    booking
      ? `Hello ${displayName}, this is your driver ${driverName} for booking ${
          booking.reference || `#${booking.id}`
        }.`
      : undefined,
  );

  return (
    <main id="driver-workspace-root" className={`page ${styles.page}`}>
      <div className={styles.shellCompact}>
        {/* TOP NAV */}
        <nav className={styles.topNav} aria-label="Driver workspace navigation">
          <div className={styles.topNavTabs}>
            <Link href="/driver/dashboard/" className={styles.topNavLink}>
              <LayoutDashboard size={15} aria-hidden="true" />
              Dashboard
            </Link>
            <Link href="/driver/bookings/" className={styles.topNavLink}>
              <ClipboardList size={15} aria-hidden="true" />
              Bookings
            </Link>
            <Link href="/driver/trips/" className={styles.topNavLink}>
              <Compass size={15} aria-hidden="true" />
              Trips
            </Link>
            <Link href="/driver/vehicle/" className={styles.topNavLink}>
              <Car size={15} aria-hidden="true" />
              Vehicle
            </Link>
            <Link href="/driver/price/" className={styles.topNavLink}>
              <DollarSign size={15} aria-hidden="true" />
              Price
            </Link>
            <Link href="/driver/insight/" className={styles.topNavLink}>
              <BarChart3 size={15} aria-hidden="true" />
              Insight
            </Link>
          </div>
          <Link href="/driver/bookings/" className={styles.linkSecondary}>
            <ArrowLeft size={14} aria-hidden="true" />
            All bookings
          </Link>
        </nav>

        {/* 4-STAGE LIVE TRIP STEPPER */}
        <ol className={styles.stepperBar} aria-label="Trip execution progress">
          {DRIVER_STAGE_ORDER.map((step, idx) => {
            const isDone = completedDone || currentStepIdx > idx || viewStepIdx > idx;
            const isActive = !completedDone && viewStepIdx === idx;
            return (
              <li
                key={step.key}
                className={`${styles.stepItem} ${
                  isActive ? styles.stepItemActive : isDone ? styles.stepItemDone : ""
                }`}
                aria-current={isActive ? "step" : undefined}
              >
                <span className={styles.stepNum} aria-hidden="true">
                  {isDone && !isActive ? <Check size={14} /> : idx + 1}
                </span>
                <span className={styles.stepText}>
                  <small>Step {idx + 1}</small>
                  <strong>{step.shortLabel}</strong>
                </span>
              </li>
            );
          })}
        </ol>

        {loading ? (
          <div className={styles.stateCard}>
            <LoaderCircle size={28} className={styles.spin} aria-hidden="true" />
            <p>Loading live trip details…</p>
          </div>
        ) : !booking ? (
          <div className={styles.stateCard}>
            <span className={styles.stateIcon} aria-hidden="true">
              <Navigation size={26} />
            </span>
            <h2>No active trip selected</h2>
            <p>
              Open your bookings list, confirm a pending booking, and tap <strong>Start trip</strong>{" "}
              to begin live GPS navigation.
            </p>
            <div className={styles.stateActions}>
              <Link href="/driver/bookings/" className={styles.linkPrimary}>
                Open driver bookings
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </div>
        ) : completedDone || currentStage === "completed" ? (
          <section className={`${styles.stateCard} ${styles.stateCardSuccess}`} role="status">
            <span className={`${styles.stateIcon} ${styles.stateIconSuccess}`} aria-hidden="true">
              <CheckCircle2 size={32} />
            </span>
            <h2>Trip completed &amp; finalized</h2>
            <p>
              Booking <strong>{booking.reference || `#${booking.id}`}</strong> (
              {booking.origin || "Origin"} → {booking.destination || "Destination"}) is marked
              completed. Both {displayName}
              {booking.company?.name ? ` and ${booking.company.name}` : ""} have been notified.
            </p>
            <div className={styles.stateActions}>
              <Link href="/driver/dashboard/" className={styles.linkPrimary}>
                Back to Driver Dashboard
              </Link>
              <Link href="/driver/bookings/" className={styles.linkSecondary}>
                View All Bookings
              </Link>
            </div>
          </section>
        ) : (
          <>
            {/* STAGE MISMATCH HELPER BANNER (if driver opened an earlier/later step URL directly) */}
            {currentStage &&
            isActiveExecutionStage(currentStage) &&
            currentStepIdx !== viewStepIdx ? (
              <div className={styles.actionCard}>
                <div className={styles.actionCardMeta}>
                  <span>
                    This booking is currently at stage:{" "}
                    <strong>{DRIVER_STAGE_LABELS[currentStage]}</strong>
                  </span>
                  <Link
                    href={driverStageRoute(booking.id, currentStage)}
                    className={styles.linkPrimary}
                  >
                    Go to current stage
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ) : null}

            {/* ===============================================================
                STAGE 1: /driver/start/ — ORIGIN CARD + LIVE GPS -> ORIGIN MAP
               =============================================================== */}
            {pageStage === "start" ? (
              <>
                <section className={styles.panel} aria-labelledby="origin-card-heading">
                  <header className={styles.panelHead}>
                    <div className={styles.panelHeadCopy}>
                      <span className={styles.eyebrow}>
                        <Navigation size={13} aria-hidden="true" />
                        Step 1 of 4 · Heading to pickup origin
                      </span>
                      <h1 id="origin-card-heading" className={styles.panelTitle}>
                        {booking.origin || "Pickup Origin"}
                      </h1>
                      <p className={styles.panelSub}>
                        {booking.reference || `Booking #${booking.id}`} ·{" "}
                        {booking.service?.title || "Private hire transfer"}
                      </p>
                    </div>
                    <span className={`${styles.statusBadge} ${styles.statusLive}`}>
                      En route to pickup
                    </span>
                  </header>

                  <div className={styles.routeBox}>
                    <div className={styles.routeStop}>
                      <span className={styles.stopPinA} aria-hidden="true">
                        A
                      </span>
                      <div className={styles.stopCopy}>
                        <span className={styles.stopLabel}>Pickup origin (target)</span>
                        <span className={styles.stopValue}>
                          {booking.origin || "Origin address"}
                        </span>
                      </div>
                    </div>
                    {booking.destination ? (
                      <div className={styles.routeStop}>
                        <span className={styles.stopPinB} aria-hidden="true">
                          B
                        </span>
                        <div className={styles.stopCopy}>
                          <span className={styles.stopLabel}>Final drop-off destination</span>
                          <span className={styles.stopValue}>{booking.destination}</span>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                      <Clock3 size={15} aria-hidden="true" />
                      <div>
                        <span>Pickup schedule</span>
                        <strong>
                          {formatShortDate(booking.travel_date, false)}
                          {booking.pickup_time ? ` · ${booking.pickup_time}` : ""}
                        </strong>
                      </div>
                    </div>
                    <div className={styles.metaItem}>
                      <Users size={15} aria-hidden="true" />
                      <div>
                        <span>Passenger</span>
                        <strong>
                          {displayName} ({booking.passengers} pax)
                        </strong>
                      </div>
                    </div>
                    <div className={styles.metaItem}>
                      <Navigation size={15} aria-hidden="true" />
                      <div>
                        <span>Live distance to pickup</span>
                        <strong>
                          {liveRoute
                            ? `${formatDistanceLabel(liveRoute.distanceKm)} · ${formatDurationLabel(
                                liveRoute.durationMins,
                              )}`
                            : "Tracking live GPS…"}
                        </strong>
                      </div>
                    </div>
                    {booking.company?.name ? (
                      <div className={styles.metaItem}>
                        <Building2 size={15} aria-hidden="true" />
                        <div>
                          <span>Assigned company</span>
                          <strong>{booking.company.name}</strong>
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {telHref || waHref ? (
                    <div className={styles.contactActions}>
                      {telHref ? (
                        <a href={telHref} className={styles.contactPillLink}>
                          <Phone size={15} aria-hidden="true" />
                          Call {displayName}
                        </a>
                      ) : null}
                      {waHref ? (
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noreferrer"
                          className={`${styles.contactPillLink} ${styles.contactPillWhatsapp}`}
                        >
                          <MessageCircle size={15} aria-hidden="true" />
                          WhatsApp
                        </a>
                      ) : null}
                    </div>
                  ) : null}
                </section>

                {/* LIVE MOVING GPS -> ORIGIN ROAD MAP */}
                <DriverLiveRouteMap
                  mode="to_origin"
                  bookingId={booking.id}
                  originLat={booking.origin_lat}
                  originLng={booking.origin_lng}
                  originLabel={booking.origin || "Pickup Origin"}
                  initialDriverLat={booking.driver_lat}
                  initialDriverLng={booking.driver_lng}
                  onPositionUpdate={handlePositionUpdate}
                  onRouteMetrics={handleRouteMetrics}
                />

                {/* ARRIVED BUTTON -> /driver/pickup/ */}
                <section className={styles.actionCard} aria-label="Confirm arrival at pickup">
                  <div className={styles.actionCardMeta}>
                    <span>
                      Live road tracking moves with your GPS until you reach{" "}
                      <strong>{booking.origin || "pickup"}</strong>.
                    </span>
                    <span>Next: Customer Pickup Info</span>
                  </div>
                  <button
                    type="button"
                    className={`${styles.btnPrimary} ${styles.stageActionBtn}`}
                    disabled={submitting}
                    onClick={() => void handleArrived()}
                  >
                    {submitting ? (
                      <LoaderCircle size={18} className={styles.spin} aria-hidden="true" />
                    ) : (
                      <MapPin size={18} aria-hidden="true" />
                    )}
                    {submitting ? "Updating status…" : "Arrived at Pickup Origin"}
                  </button>
                </section>
              </>
            ) : null}

            {/* ===============================================================
                STAGE 2: /driver/pickup/ — FULL CUSTOMER ACCOUNT INFO + PICKED UP
               =============================================================== */}
            {pageStage === "pickup" ? (
              <>
                <section className={styles.panel} aria-labelledby="pickup-customer-heading">
                  <header className={styles.panelHead}>
                    <div className={styles.panelHeadCopy}>
                      <span className={styles.eyebrow}>
                        <UserCheck size={13} aria-hidden="true" />
                        Step 2 of 4 · Pickup customer verification
                      </span>
                      <h1 id="pickup-customer-heading" className={styles.panelTitle}>
                        Arrived at pickup — Customer account details
                      </h1>
                      <p className={styles.panelSub}>
                        Verify your passenger below before tapping <strong>Picked Up</strong> to
                        launch live trip navigation.
                      </p>
                    </div>
                    <span className={`${styles.statusBadge} ${styles.statusConfirmed}`}>
                      <CheckCircle2 size={13} aria-hidden="true" />
                      Arrived{booking.arrived_at ? ` · ${formatClockTime(booking.arrived_at)}` : ""}
                    </span>
                  </header>

                  {/* FULL CUSTOMER ACCOUNT PROFILE CARD */}
                  <div className={styles.customerHero}>
                    <div className={styles.customerIdentity}>
                      <div className={styles.customerAvatar}>
                        {customer?.avatar_url ? (
                          <Image
                            src={customer.avatar_url}
                            alt={displayName}
                            width={64}
                            height={64}
                            unoptimized
                          />
                        ) : (
                          personInitials(displayName)
                        )}
                      </div>
                      <div>
                        <h2 className={styles.customerName}>{displayName}</h2>
                        <div className={styles.customerHandleRow}>
                          {customer?.username ? <span>@{customer.username}</span> : null}
                          {customer?.email_verified ? (
                            <span className={`${styles.statusBadge} ${styles.statusConfirmed}`}>
                              <ShieldCheck size={12} aria-hidden="true" />
                              Verified account
                            </span>
                          ) : (
                            <span className={styles.companyTag}>Guest / Booking contact</span>
                          )}
                          {customer?.date_joined ? (
                            <span>Member since {formatShortDate(customer.date_joined)}</span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className={styles.contactActions}>
                      {telHref ? (
                        <a href={telHref} className={styles.contactPillLink}>
                          <Phone size={15} aria-hidden="true" />
                          Call
                        </a>
                      ) : null}
                      {waHref ? (
                        <a
                          href={waHref}
                          target="_blank"
                          rel="noreferrer"
                          className={`${styles.contactPillLink} ${styles.contactPillWhatsapp}`}
                        >
                          <MessageCircle size={15} aria-hidden="true" />
                          WhatsApp
                        </a>
                      ) : null}
                      {displayEmail ? (
                        <a href={`mailto:${displayEmail}`} className={styles.contactPillLink}>
                          <Mail size={15} aria-hidden="true" />
                          Email
                        </a>
                      ) : null}
                    </div>
                  </div>

                  {/* COMPLETE CUSTOMER & BOOKING DETAILS GRID */}
                  <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                      <Phone size={15} aria-hidden="true" />
                      <div>
                        <span>Phone number</span>
                        <strong>{displayPhone || "Not provided"}</strong>
                      </div>
                    </div>
                    <div className={styles.metaItem}>
                      <Mail size={15} aria-hidden="true" />
                      <div>
                        <span>Account email</span>
                        <strong>{displayEmail || "Not provided"}</strong>
                      </div>
                    </div>
                    <div className={styles.metaItem}>
                      <Users size={15} aria-hidden="true" />
                      <div>
                        <span>Passengers</span>
                        <strong>
                          {booking.passengers}{" "}
                          {booking.passengers === 1 ? "passenger" : "passengers"}
                        </strong>
                      </div>
                    </div>
                    <div className={styles.metaItem}>
                      <CalendarDays size={15} aria-hidden="true" />
                      <div>
                        <span>Booking reference</span>
                        <strong>{booking.reference || `Booking #${booking.id}`}</strong>
                      </div>
                    </div>
                    {customer?.address ? (
                      <div className={styles.metaItem}>
                        <MapPin size={15} aria-hidden="true" />
                        <div>
                          <span>Customer address</span>
                          <strong>{customer.address}</strong>
                        </div>
                      </div>
                    ) : null}
                    {vehicle ? (
                      <div className={styles.metaItem}>
                        <Car size={15} aria-hidden="true" />
                        <div>
                          <span>Assigned vehicle</span>
                          <strong>
                            {vehicle.name} · {vehicle.plate_number}
                          </strong>
                        </div>
                      </div>
                    ) : null}
                    {booking.total_price ? (
                      <div className={styles.metaItem}>
                        <Wallet size={15} aria-hidden="true" />
                        <div>
                          <span>Agreed fare</span>
                          <strong>{Number(booking.total_price).toLocaleString()} TZS</strong>
                        </div>
                      </div>
                    ) : null}
                    <div className={styles.metaItem}>
                      <Building2 size={15} aria-hidden="true" />
                      <div>
                        <span>Dispatch company</span>
                        <strong>{booking.company?.name || companyName}</strong>
                      </div>
                    </div>
                  </div>

                  {/* ROUTE PREVIEW */}
                  <div className={styles.routeBox}>
                    <div className={styles.routeStop}>
                      <span className={styles.stopPinA} aria-hidden="true">
                        A
                      </span>
                      <div className={styles.stopCopy}>
                        <span className={styles.stopLabel}>Current pickup origin</span>
                        <span className={styles.stopValue}>
                          {booking.origin || "Pickup point"}
                        </span>
                      </div>
                    </div>
                    <div className={styles.routeStop}>
                      <span className={styles.stopPinB} aria-hidden="true">
                        B
                      </span>
                      <div className={styles.stopCopy}>
                        <span className={styles.stopLabel}>Drop-off destination</span>
                        <span className={styles.stopValue}>
                          {booking.destination || "Destination"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {booking.notes ? (
                    <p className={styles.notesCallout}>
                      <strong>Customer notes:</strong> {booking.notes}
                    </p>
                  ) : null}
                </section>

                {/* PICKED UP BUTTON -> /driver/trip/ */}
                <section className={styles.actionCard} aria-label="Confirm customer pickup">
                  <div className={styles.actionCardMeta}>
                    <span>Confirm once {displayName} is safely onboard.</span>
                    <span>Next: Live Origin → Destination Map</span>
                  </div>
                  <button
                    type="button"
                    className={`${styles.btnEmerald} ${styles.stageActionBtn}`}
                    disabled={submitting}
                    onClick={() => void handlePickedUp()}
                  >
                    {submitting ? (
                      <LoaderCircle size={18} className={styles.spin} aria-hidden="true" />
                    ) : (
                      <UserCheck size={18} aria-hidden="true" />
                    )}
                    {submitting ? "Starting trip…" : "Picked Up — Start Trip to Destination"}
                  </button>
                </section>
              </>
            ) : null}

            {/* ===============================================================
                STAGE 3: /driver/trip/ — ORIGIN -> DESTINATION LIVE ROAD MAP
               =============================================================== */}
            {pageStage === "trip" ? (
              <>
                <section className={styles.panel} aria-labelledby="live-trip-heading">
                  <header className={styles.panelHead}>
                    <div className={styles.panelHeadCopy}>
                      <span className={styles.eyebrow}>
                        <Navigation size={13} aria-hidden="true" />
                        Step 3 of 4 · Live trip in progress
                      </span>
                      <h1 id="live-trip-heading" className={styles.panelTitle}>
                        {booking.origin?.split(",")[0] || "Origin"} →{" "}
                        {booking.destination?.split(",")[0] || "Destination"}
                      </h1>
                      <p className={styles.panelSub}>
                        Passenger onboard: <strong>{displayName}</strong> ({booking.passengers} pax)
                        {booking.picked_up_at
                          ? ` · Picked up at ${formatClockTime(booking.picked_up_at)}`
                          : ""}
                      </p>
                    </div>
                    <span className={`${styles.statusBadge} ${styles.statusLive}`}>
                      Live trip underway
                    </span>
                  </header>

                  <div className={styles.routeBox}>
                    <div className={styles.routeStop}>
                      <span className={styles.stopPinA} aria-hidden="true">
                        A
                      </span>
                      <div className={styles.stopCopy}>
                        <span className={styles.stopLabel}>Origin (picked up)</span>
                        <span className={styles.stopValue}>
                          {booking.origin || "Pickup origin"}
                        </span>
                      </div>
                    </div>
                    <div className={styles.routeStop}>
                      <span className={styles.stopPinB} aria-hidden="true">
                        B
                      </span>
                      <div className={styles.stopCopy}>
                        <span className={styles.stopLabel}>Destination (live target)</span>
                        <span className={styles.stopValue}>
                          {booking.destination || "Drop-off destination"}
                        </span>
                      </div>
                    </div>
                    <div className={styles.routeMetaChips}>
                      <span>
                        Remaining:{" "}
                        {liveRoute
                          ? formatDistanceLabel(liveRoute.distanceKm)
                          : formatDistanceLabel(booking.distance_km)}
                      </span>
                      <span>·</span>
                      <span>
                        ETA:{" "}
                        {liveRoute
                          ? formatDurationLabel(liveRoute.durationMins)
                          : formatDurationLabel(booking.duration_mins)}
                      </span>
                    </div>
                  </div>
                </section>

                {/* LIVE MOVING GPS + ORIGIN -> DESTINATION ROAD MAP */}
                <DriverLiveRouteMap
                  mode="to_destination"
                  bookingId={booking.id}
                  originLat={booking.origin_lat}
                  originLng={booking.origin_lng}
                  originLabel={booking.origin || "Origin"}
                  destinationLat={booking.dest_lat}
                  destinationLng={booking.dest_lng}
                  destinationLabel={booking.destination || "Destination"}
                  initialDriverLat={booking.driver_lat}
                  initialDriverLng={booking.driver_lng}
                  onPositionUpdate={handlePositionUpdate}
                  onRouteMetrics={handleRouteMetrics}
                />

                {/* DESTINATION BUTTON -> /driver/finalize/ */}
                <section className={styles.actionCard} aria-label="Mark destination reached">
                  <div className={styles.actionCardMeta}>
                    <span>
                      Live road line updates continuously as you approach{" "}
                      <strong>{booking.destination || "destination"}</strong>.
                    </span>
                    <span>Next: Finalize &amp; Complete Trip</span>
                  </div>
                  <button
                    type="button"
                    className={`${styles.btnPrimary} ${styles.stageActionBtn}`}
                    disabled={submitting}
                    onClick={() => void handleReachedDestination()}
                  >
                    {submitting ? (
                      <LoaderCircle size={18} className={styles.spin} aria-hidden="true" />
                    ) : (
                      <Flag size={18} aria-hidden="true" />
                    )}
                    {submitting ? "Updating…" : "Destination Reached"}
                  </button>
                </section>
              </>
            ) : null}

            {/* ===============================================================
                STAGE 4: /driver/finalize/ — REVIEW & COMPLETE TRIP
               =============================================================== */}
            {pageStage === "finalize" ? (
              <>
                <section className={styles.panel} aria-labelledby="finalize-trip-heading">
                  <header className={styles.panelHead}>
                    <div className={styles.panelHeadCopy}>
                      <span className={styles.eyebrow}>
                        <Flag size={13} aria-hidden="true" />
                        Step 4 of 4 · Finalize trip
                      </span>
                      <h1 id="finalize-trip-heading" className={styles.panelTitle}>
                        Complete &amp; close this trip
                      </h1>
                      <p className={styles.panelSub}>
                        Confirm drop-off details below to complete{" "}
                        <strong>{booking.reference || `Booking #${booking.id}`}</strong> and notify{" "}
                        {displayName}
                        {booking.company?.name ? ` & ${booking.company.name}` : ""}.
                      </p>
                    </div>
                    <span className={`${styles.statusBadge} ${styles.statusConfirmed}`}>
                      At destination
                    </span>
                  </header>

                  <div className={styles.routeBox}>
                    <div className={styles.routeStop}>
                      <span className={styles.stopPinA} aria-hidden="true">
                        A
                      </span>
                      <div className={styles.stopCopy}>
                        <span className={styles.stopLabel}>Origin</span>
                        <span className={styles.stopValue}>{booking.origin || "Origin"}</span>
                      </div>
                    </div>
                    <div className={styles.routeStop}>
                      <span className={styles.stopPinB} aria-hidden="true">
                        B
                      </span>
                      <div className={styles.stopCopy}>
                        <span className={styles.stopLabel}>Destination</span>
                        <span className={styles.stopValue}>
                          {booking.destination || "Destination"}
                        </span>
                      </div>
                    </div>
                    {booking.distance_km || booking.duration_mins ? (
                      <div className={styles.routeMetaChips}>
                        <span>{formatDistanceLabel(booking.distance_km)}</span>
                        <span>·</span>
                        <span>{formatDurationLabel(booking.duration_mins)}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                      <Users size={15} aria-hidden="true" />
                      <div>
                        <span>Customer</span>
                        <strong>
                          {displayName} ({booking.passengers} pax)
                        </strong>
                      </div>
                    </div>
                    {vehicle ? (
                      <div className={styles.metaItem}>
                        <Car size={15} aria-hidden="true" />
                        <div>
                          <span>Vehicle</span>
                          <strong>
                            {vehicle.name} · {vehicle.plate_number}
                          </strong>
                        </div>
                      </div>
                    ) : null}
                    {booking.total_price ? (
                      <div className={styles.metaItem}>
                        <Wallet size={15} aria-hidden="true" />
                        <div>
                          <span>Fare</span>
                          <strong>{Number(booking.total_price).toLocaleString()} TZS</strong>
                        </div>
                      </div>
                    ) : null}
                    <div className={styles.metaItem}>
                      <Building2 size={15} aria-hidden="true" />
                      <div>
                        <span>Company</span>
                        <strong>{booking.company?.name || companyName}</strong>
                      </div>
                    </div>
                  </div>

                  {/* TRIP EXECUTION AUDIT TIMELINE */}
                  <div>
                    <span className={styles.eyebrow} style={{ marginBottom: 8 }}>
                      Trip timeline
                    </span>
                    <ul className={styles.timeline}>
                      <li className={styles.timelineRow}>
                        <span className={styles.timelineLeft}>
                          <CheckCircle2 size={16} aria-hidden="true" />
                          Booking confirmed
                        </span>
                        <span className={styles.timelineTime}>
                          {formatClockTime(booking.confirmed_at)}
                        </span>
                      </li>
                      <li className={styles.timelineRow}>
                        <span className={styles.timelineLeft}>
                          <CheckCircle2 size={16} aria-hidden="true" />
                          Started to pickup origin
                        </span>
                        <span className={styles.timelineTime}>
                          {formatClockTime(booking.started_at)}
                        </span>
                      </li>
                      <li className={styles.timelineRow}>
                        <span className={styles.timelineLeft}>
                          <CheckCircle2 size={16} aria-hidden="true" />
                          Arrived at pickup
                        </span>
                        <span className={styles.timelineTime}>
                          {formatClockTime(booking.arrived_at)}
                        </span>
                      </li>
                      <li className={styles.timelineRow}>
                        <span className={styles.timelineLeft}>
                          <CheckCircle2 size={16} aria-hidden="true" />
                          Passenger picked up
                        </span>
                        <span className={styles.timelineTime}>
                          {formatClockTime(booking.picked_up_at)}
                        </span>
                      </li>
                      <li className={styles.timelineRow}>
                        <span className={styles.timelineLeft}>
                          <CheckCircle2 size={16} aria-hidden="true" />
                          Reached destination
                        </span>
                        <span className={styles.timelineTime}>
                          {formatClockTime(booking.reached_dest_at)}
                        </span>
                      </li>
                    </ul>
                  </div>

                  {/* OPTIONAL DRIVER COMPLETION NOTES */}
                  <div className={styles.notesField}>
                    <label htmlFor="driver-finalize-notes" className={styles.notesLabel}>
                      Driver completion notes (optional)
                    </label>
                    <textarea
                      id="driver-finalize-notes"
                      className={styles.notesTextarea}
                      value={driverNotes}
                      onChange={(e) => setDriverNotes(e.target.value)}
                      maxLength={1500}
                      placeholder="Add drop-off notes, luggage handover, or extra stop summary…"
                    />
                  </div>
                </section>

                {/* FINALIZE & COMPLETE BUTTON */}
                <section className={styles.actionCard} aria-label="Finalize trip">
                  <div className={styles.actionCardMeta}>
                    <span>Marks trip as completed and notifies customer &amp; company.</span>
                    <span>Final step</span>
                  </div>
                  <button
                    type="button"
                    className={`${styles.btnEmerald} ${styles.stageActionBtn}`}
                    disabled={submitting}
                    onClick={() => void handleFinalizeTrip()}
                  >
                    {submitting ? (
                      <LoaderCircle size={18} className={styles.spin} aria-hidden="true" />
                    ) : (
                      <CheckCircle2 size={18} aria-hidden="true" />
                    )}
                    {submitting ? "Completing trip…" : "Finalize & Complete Trip"}
                  </button>
                </section>
              </>
            ) : null}
          </>
        )}
      </div>
    </main>
  );
}
