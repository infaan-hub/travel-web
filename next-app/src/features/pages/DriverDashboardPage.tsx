"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BarChart3,
  Building2,
  CalendarDays,
  Car,
  Check,
  CheckCircle2,
  ClipboardList,
  Clock3,
  Compass,
  LayoutDashboard,
  LoaderCircle,
  MapPin,
  Navigation,
  Play,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { driverAPI } from "@/lib/api/client";
import {
  DRIVER_STAGE_LABELS,
  driverStageRoute,
  formatDistanceLabel,
  formatDurationLabel,
  isActiveExecutionStage,
  resolveDriverStage,
} from "@/lib/driver-workflow";
import {
  formatShortDate,
  type DriverBookingRecord,
  type DriverTripRequestRecord,
} from "@/features/driver/driver-types";
import { useToast } from "@/components/ToastProvider";
import styles from "@/features/pages/driver-workspace.module.css";

type Props = {
  driverName: string;
  companyName: string;
  isPublicDriver?: boolean;
};

export default function DriverDashboardPage({
  driverName,
  companyName,
  isPublicDriver = false,
}: Props) {
  const router = useRouter();
  const toast = useToast();

  const [bookings, setBookings] = useState<DriverBookingRecord[]>([]);
  const [openRequests, setOpenRequests] = useState<DriverTripRequestRecord[]>([]);
  const [acceptedRequests, setAcceptedRequests] = useState<DriverTripRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingsRes, requestsRes] = await Promise.all([
        driverAPI.getBookings(),
        driverAPI.getTripRequests(),
      ]);
      setBookings((bookingsRes.data?.bookings ?? []) as DriverBookingRecord[]);
      setOpenRequests((requestsRes.data?.results ?? []) as DriverTripRequestRecord[]);
      setAcceptedRequests((requestsRes.data?.assigned ?? []) as DriverTripRequestRecord[]);
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Could not load your driver workspace.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const activeLiveBooking = useMemo(
    () => bookings.find((b) => isActiveExecutionStage(resolveDriverStage(b))) ?? null,
    [bookings],
  );

  const pendingBookings = useMemo(
    () => bookings.filter((b) => resolveDriverStage(b) === "pending"),
    [bookings],
  );

  const confirmedBookings = useMemo(
    () => bookings.filter((b) => resolveDriverStage(b) === "confirmed"),
    [bookings],
  );

  const liveBookings = useMemo(
    () => bookings.filter((b) => isActiveExecutionStage(resolveDriverStage(b))),
    [bookings],
  );

  const completedBookings = useMemo(
    () => bookings.filter((b) => b.status === "completed"),
    [bookings],
  );

  const priorityQueue = useMemo(() => {
    return [...pendingBookings, ...confirmedBookings].slice(0, 5);
  }, [confirmedBookings, pendingBookings]);

  const handleConfirm = async (booking: DriverBookingRecord) => {
    setBusyId(booking.id);
    try {
      const res = await driverAPI.transitionBooking(booking.id, { action: "confirm" });
      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id ? ({ ...item, ...(res.data ?? {}) } as DriverBookingRecord) : item,
        ),
      );
      toast.success(
        booking.company?.name
          ? `Trip confirmed! Customer and ${booking.company.name} have been notified.`
          : "Trip confirmed! The customer has been notified.",
      );
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Could not confirm this trip.");
      void load();
    } finally {
      setBusyId(null);
    }
  };

  const handleStartTrip = async (booking: DriverBookingRecord) => {
    setBusyId(booking.id);
    try {
      await driverAPI.transitionBooking(booking.id, { action: "start" });
      toast.success("Trip started! Navigating to pickup origin.");
      router.push(`/driver/start/?booking=${booking.id}`);
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Could not start this trip.");
      setBusyId(null);
    }
  };

  const activeStage = activeLiveBooking ? resolveDriverStage(activeLiveBooking) : null;
  const activeRouteHref =
    activeLiveBooking && activeStage
      ? driverStageRoute(activeLiveBooking.id, activeStage)
      : null;

  return (
    <main id="driver-workspace-root" className={`page ${styles.page}`}>
      <div className={styles.shell}>
        {/* TOP WORKSPACE NAVIGATION */}
        <nav className={styles.topNav} aria-label="Driver workspace navigation">
          <div className={styles.topNavTabs}>
            <Link
              href="/driver/dashboard/"
              className={`${styles.topNavLink} ${styles.topNavLinkActive}`}
              aria-current="page"
            >
              <LayoutDashboard size={15} aria-hidden="true" />
              Dashboard
            </Link>
            <Link href="/driver/bookings/" className={styles.topNavLink}>
              <ClipboardList size={15} aria-hidden="true" />
              Bookings
              {pendingBookings.length + confirmedBookings.length > 0 ? (
                <span className={styles.navPillCount}>
                  {pendingBookings.length + confirmedBookings.length}
                </span>
              ) : null}
            </Link>
            <Link href="/driver/trips/" className={styles.topNavLink}>
              <Compass size={15} aria-hidden="true" />
              Trips
            </Link>
            <Link href="/driver/insight/" className={styles.topNavLink}>
              <BarChart3 size={15} aria-hidden="true" />
              Insight
            </Link>
            {activeRouteHref && activeStage ? (
              <Link
                href={activeRouteHref}
                className={`${styles.topNavLink} ${styles.topNavLiveLink}`}
              >
                <span className={styles.liveDot} aria-hidden="true" />
                Active trip · {DRIVER_STAGE_LABELS[activeStage]}
              </Link>
            ) : null}
          </div>

          <button
            type="button"
            className={styles.btnSecondary}
            onClick={() => void load()}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? styles.spin : ""} aria-hidden="true" />
            Refresh
          </button>
        </nav>

        {/* EXECUTIVE HEADER CARD */}
        <header className={styles.heroCard}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrowRow}>
              <span className={styles.eyebrow}>
                <Building2 size={13} aria-hidden="true" />
                {isPublicDriver ? "Verified public hire driver" : `Assigned fleet · ${companyName}`}
              </span>
              <span className={styles.dutyBadge}>
                <ShieldCheck size={13} aria-hidden="true" />
                On duty
              </span>
            </div>
            <h1 className={styles.heroTitle}>Welcome back, {driverName}</h1>
            <p className={styles.heroLead}>
              Confirm incoming bookings, notify customers and {companyName} automatically, and run
              live GPS-guided trips from pickup to drop-off.
            </p>
          </div>

          <div className={styles.heroActions}>
            <Link href="/driver/bookings/" className={styles.linkPrimary}>
              Open Bookings Queue
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        </header>

        {/* LIVE ACTIVE TRIP SPOTLIGHT BANNER */}
        {activeLiveBooking && activeStage && activeRouteHref ? (
          <section className={styles.activeTripBanner} aria-label="Active trip in progress">
            <div className={styles.activeTripInfo}>
              <span className={styles.activeTripPill}>
                <Navigation size={12} aria-hidden="true" />
                Live trip · {DRIVER_STAGE_LABELS[activeStage]}
              </span>
              <h2>
                {activeLiveBooking.origin || "Pickup origin"} →{" "}
                {activeLiveBooking.destination || "Destination"}
              </h2>
              <p>
                {activeLiveBooking.reference || `Booking #${activeLiveBooking.id}`} ·{" "}
                {activeLiveBooking.full_name} · {activeLiveBooking.passengers}{" "}
                {activeLiveBooking.passengers === 1 ? "passenger" : "passengers"}
                {activeLiveBooking.pickup_time ? ` · Pickup ${activeLiveBooking.pickup_time}` : ""}
              </p>
            </div>
            <Link href={activeRouteHref} className={styles.resumeBtn}>
              Resume live trip
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </section>
        ) : null}

        {/* 4-CARD EXECUTIVE KPI STRIP */}
        <section className={styles.kpiGrid} aria-label="Driver dispatch metrics">
          <article className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Pending</span>
              <span className={`${styles.kpiIcon} ${styles.kpiIconAmber}`} aria-hidden="true">
                <Clock3 size={17} />
              </span>
            </div>
            <strong className={styles.kpiValue}>
              {loading ? "—" : pendingBookings.length + openRequests.length}
            </strong>
            <span className={styles.kpiSub}>Awaiting your confirmation</span>
          </article>

          <article className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Ready to start</span>
              <span className={`${styles.kpiIcon} ${styles.kpiIconEmerald}`} aria-hidden="true">
                <CheckCircle2 size={17} />
              </span>
            </div>
            <strong className={styles.kpiValue}>
              {loading ? "—" : confirmedBookings.length}
            </strong>
            <span className={styles.kpiSub}>Verified &amp; ready for pickup</span>
          </article>

          <article className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Live underway</span>
              <span className={`${styles.kpiIcon} ${styles.kpiIconTeal}`} aria-hidden="true">
                <Navigation size={17} />
              </span>
            </div>
            <strong className={styles.kpiValue}>
              {loading ? "—" : liveBookings.length + acceptedRequests.length}
            </strong>
            <span className={styles.kpiSub}>Active GPS journeys</span>
          </article>

          <article className={styles.kpiCard}>
            <div className={styles.kpiTop}>
              <span className={styles.kpiLabel}>Completed</span>
              <span className={styles.kpiIcon} aria-hidden="true">
                <Car size={17} />
              </span>
            </div>
            <strong className={styles.kpiValue}>
              {loading ? "—" : completedBookings.length}
            </strong>
            <span className={styles.kpiSub}>Finalized trips</span>
          </article>
        </section>

        {/* 2-COLUMN OPERATIONS GRID */}
        <div className={styles.opsGrid}>
          {/* LEFT: PRIORITY DISPATCH QUEUE */}
          <section className={styles.panel} aria-labelledby="priority-queue-heading">
            <header className={styles.panelHead}>
              <div className={styles.panelHeadCopy}>
                <span className={styles.eyebrow}>Dispatch queue</span>
                <h2 id="priority-queue-heading" className={styles.panelTitle}>
                  Pending &amp; ready-to-start bookings
                </h2>
                <p className={styles.panelSub}>
                  Confirm pending trips to notify customer &amp; company, then tap Start trip.
                </p>
              </div>
              <Link href="/driver/bookings/" className={styles.linkSecondary}>
                View all ({bookings.length})
              </Link>
            </header>

            {loading ? (
              <div className={styles.stateCard}>
                <LoaderCircle size={26} className={styles.spin} aria-hidden="true" />
                <p>Loading your dispatch queue…</p>
              </div>
            ) : priorityQueue.length === 0 ? (
              <div className={styles.stateCard}>
                <span className={styles.stateIcon} aria-hidden="true">
                  <ClipboardList size={26} />
                </span>
                <h3>Queue is all clear</h3>
                <p>
                  No pending or unstarted bookings right now. New company assignments and direct
                  bookings will show up here immediately.
                </p>
                <div className={styles.stateActions}>
                  <Link href="/driver/bookings/" className={styles.linkSecondary}>
                    Open full bookings history
                  </Link>
                </div>
              </div>
            ) : (
              <div className={styles.bookingList}>
                {priorityQueue.map((booking) => {
                  const stage = resolveDriverStage(booking);
                  const isPending = stage === "pending";
                  const isBusy = busyId === booking.id;
                  const vehicle = booking.service?.vehicle ?? booking.vehicle;

                  return (
                    <article className={styles.bookingCard} key={booking.id}>
                      <div className={styles.bookingCardTop}>
                        <div className={styles.bookingIdentity}>
                          <span className={styles.bookingIcon} aria-hidden="true">
                            <Car size={19} />
                          </span>
                          <div>
                            <span className={styles.bookingRef}>
                              {booking.reference || `Booking #${booking.id}`}
                            </span>
                            <h3 className={styles.bookingTitle}>
                              {booking.service?.title || "Private hire transfer"}
                            </h3>
                          </div>
                        </div>

                        <div className={styles.badgeGroup}>
                          <span
                            className={`${styles.statusBadge} ${
                              isPending ? styles.statusPending : styles.statusConfirmed
                            }`}
                          >
                            {isPending ? "Pending confirmation" : "Verified · Ready"}
                          </span>
                        </div>
                      </div>

                      {booking.origin || booking.destination ? (
                        <div className={styles.routeBox}>
                          <div className={styles.routeStop}>
                            <span className={styles.stopPinA} aria-hidden="true">
                              A
                            </span>
                            <div className={styles.stopCopy}>
                              <span className={styles.stopLabel}>Origin</span>
                              <span className={styles.stopValue}>
                                {booking.origin || "Pickup to be confirmed"}
                              </span>
                            </div>
                          </div>
                          <div className={styles.routeStop}>
                            <span className={styles.stopPinB} aria-hidden="true">
                              B
                            </span>
                            <div className={styles.stopCopy}>
                              <span className={styles.stopLabel}>Destination</span>
                              <span className={styles.stopValue}>
                                {booking.destination || "Drop-off to be confirmed"}
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
                      ) : null}

                      <div className={styles.metaGrid}>
                        <div className={styles.metaItem}>
                          <CalendarDays size={15} aria-hidden="true" />
                          <div>
                            <span>Travel date</span>
                            <strong>
                              {formatShortDate(booking.travel_date)}
                              {booking.pickup_time ? ` · ${booking.pickup_time}` : ""}
                            </strong>
                          </div>
                        </div>
                        <div className={styles.metaItem}>
                          <Users size={15} aria-hidden="true" />
                          <div>
                            <span>Customer</span>
                            <strong>
                              {booking.full_name} ({booking.passengers} pax)
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
                      </div>

                      <footer className={styles.bookingFooter}>
                        <span
                          className={`${styles.footerHint} ${
                            !isPending ? styles.footerHintVerified : ""
                          }`}
                        >
                          {isPending
                            ? "Confirm to verify & notify customer and company"
                            : "Verified · Ready to navigate to pickup"}
                        </span>
                        <div className={styles.footerActions}>
                          {isPending ? (
                            <button
                              type="button"
                              className={styles.btnPrimary}
                              disabled={isBusy}
                              onClick={() => void handleConfirm(booking)}
                            >
                              {isBusy ? (
                                <LoaderCircle size={16} className={styles.spin} aria-hidden="true" />
                              ) : (
                                <Check size={16} aria-hidden="true" />
                              )}
                              Confirm trip
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={styles.btnEmerald}
                              disabled={isBusy}
                              onClick={() => void handleStartTrip(booking)}
                            >
                              {isBusy ? (
                                <LoaderCircle size={16} className={styles.spin} aria-hidden="true" />
                              ) : (
                                <Play size={15} aria-hidden="true" />
                              )}
                              Start trip
                            </button>
                          )}
                        </div>
                      </footer>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* RIGHT: 4-STAGE EXECUTION WORKFLOW + RECENT COMPLETED */}
          <aside style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <section className={styles.panel} aria-labelledby="workflow-guide-heading">
              <div className={styles.panelHeadCopy}>
                <span className={styles.eyebrow}>Live trip workflow</span>
                <h2 id="workflow-guide-heading" className={styles.panelTitle}>
                  4-step live dispatch
                </h2>
              </div>
              <ol className={styles.guideSteps}>
                <li className={styles.guideStep}>
                  <span className={styles.guideStepNum}>1</span>
                  <div>
                    <strong>Confirm &amp; Start to Origin</strong>
                    <span>
                      Verify booking on /driver/bookings/ then follow the live GPS road line to the
                      customer&apos;s pickup origin.
                    </span>
                  </div>
                </li>
                <li className={styles.guideStep}>
                  <span className={styles.guideStepNum}>2</span>
                  <div>
                    <strong>Arrived &amp; Pickup Verification</strong>
                    <span>
                      Tap Arrived to view full customer account details, contact links, and
                      confirm boarding.
                    </span>
                  </div>
                </li>
                <li className={styles.guideStep}>
                  <span className={styles.guideStepNum}>3</span>
                  <div>
                    <strong>Live Trip to Destination</strong>
                    <span>
                      Track live road routing from origin to destination until drop-off.
                    </span>
                  </div>
                </li>
                <li className={styles.guideStep}>
                  <span className={styles.guideStepNum}>4</span>
                  <div>
                    <strong>Finalize &amp; Complete</strong>
                    <span>
                      Review timeline, add optional handover notes, and notify both customer and
                      company.
                    </span>
                  </div>
                </li>
              </ol>
            </section>

            <section className={styles.panel} aria-labelledby="recent-completed-heading">
              <div className={styles.panelHeadCopy}>
                <span className={styles.eyebrow}>History</span>
                <h2 id="recent-completed-heading" className={styles.panelTitle}>
                  Recently completed
                </h2>
              </div>
              {completedBookings.length === 0 ? (
                <p className={styles.panelSub}>
                  Completed journeys will appear here after you finalize your first trip.
                </p>
              ) : (
                <ul className={styles.timeline}>
                  {completedBookings.slice(0, 4).map((item) => (
                    <li className={styles.timelineRow} key={item.id}>
                      <span className={styles.timelineLeft}>
                        <MapPin size={15} aria-hidden="true" />
                        <span>
                          {item.origin?.split(",")[0] || "Origin"} →{" "}
                          {item.destination?.split(",")[0] || "Destination"}
                        </span>
                      </span>
                      <span className={styles.timelineTime}>
                        {formatShortDate(item.travel_date, false)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
