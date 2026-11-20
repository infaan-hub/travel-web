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
  Mail,
  MapPin,
  Navigation,
  Phone,
  Play,
  Radio,
  RefreshCw,
  Search,
  Truck,
  Users,
  Wallet,
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
  formatClockTime,
  formatPhoneHref,
  formatShortDate,
  type DriverBookingRecord,
  type DriverTripRequestRecord,
} from "@/features/driver/driver-types";
import { useToast } from "@/components/ToastProvider";
import styles from "@/features/pages/driver-workspace.module.css";

type FilterMode = "all" | "pending" | "public" | "confirmed" | "active" | "completed";

type Props = {
  driverName: string;
  companyName: string;
  isPublicDriver: boolean;
};

const STAGE_SORT_RANK: Record<string, number> = {
  en_route_to_origin: 0,
  arrived_at_origin: 0,
  in_trip: 0,
  reached_destination: 0,
  pending: 1,
  confirmed: 2,
  completed: 3,
  cancelled: 4,
};

export default function DriverBookingsPage({
  driverName,
  companyName,
  isPublicDriver,
}: Props) {
  const router = useRouter();
  const toast = useToast();

  const [bookings, setBookings] = useState<DriverBookingRecord[]>([]);
  const [openRequests, setOpenRequests] = useState<DriverTripRequestRecord[]>([]);
  const [acceptedRequests, setAcceptedRequests] = useState<DriverTripRequestRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterMode>("all");
  const [search, setSearch] = useState("");

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
      toast.error(axiosErr?.response?.data?.message || "Could not load your bookings.");
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

  const counts = useMemo(() => {
    let pending = 0;
    let publicPending = 0;
    let confirmed = 0;
    let active = 0;
    let completed = 0;
    for (const b of bookings) {
      const st = resolveDriverStage(b);
      if (st === "pending") {
        pending += 1;
        if (b.is_public) publicPending += 1;
      } else if (st === "confirmed") confirmed += 1;
      else if (isActiveExecutionStage(st)) active += 1;
      else if (st === "completed") completed += 1;
    }
    return { all: bookings.length, pending, publicPending, confirmed, active, completed };
  }, [bookings]);

  const filteredBookings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return bookings
      .filter((b) => {
        const st = resolveDriverStage(b);
        if (filter === "pending" && st !== "pending") return false;
        if (filter === "public" && !(st === "pending" && b.is_public)) return false;
        if (filter === "confirmed" && st !== "confirmed") return false;
        if (filter === "active" && !isActiveExecutionStage(st)) return false;
        if (filter === "completed" && st !== "completed") return false;
        if (!q) return true;
        const haystack = [
          b.reference,
          b.full_name,
          b.origin,
          b.destination,
          b.service?.title,
          b.company?.name,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return haystack.includes(q);
      })
      .sort((a, b) => {
        const ra = STAGE_SORT_RANK[resolveDriverStage(a)] ?? 9;
        const rb = STAGE_SORT_RANK[resolveDriverStage(b)] ?? 9;
        if (ra !== rb) return ra - rb;
        return new Date(a.travel_date).getTime() - new Date(b.travel_date).getTime();
      });
  }, [bookings, filter, search]);

  const handleConfirmBooking = async (booking: DriverBookingRecord) => {
    const key = `confirm-${booking.id}`;
    setBusyKey(key);
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
      setBusyKey(null);
    }
  };

  const handleStartTrip = async (booking: DriverBookingRecord) => {
    const key = `start-${booking.id}`;
    setBusyKey(key);
    try {
      await driverAPI.transitionBooking(booking.id, { action: "start" });
      toast.success("Trip started — navigating to pickup origin.");
      router.push(`/driver/start/?booking=${booking.id}`);
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Could not start this trip.");
      setBusyKey(null);
    }
  };

  const handleAcceptRequest = async (request: DriverTripRequestRecord) => {
    const key = `req-${request.id}`;
    setBusyKey(key);
    try {
      await driverAPI.acceptTripRequest(request.id);
      toast.success("Trip request accepted! The customer has been informed.");
      void load();
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "This trip request is no longer available.");
      void load();
    } finally {
      setBusyKey(null);
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
            <Link href="/driver/dashboard/" className={styles.topNavLink}>
              <LayoutDashboard size={15} aria-hidden="true" />
              Dashboard
            </Link>
            <Link
              href="/driver/bookings/"
              className={`${styles.topNavLink} ${styles.topNavLinkActive}`}
              aria-current="page"
            >
              <ClipboardList size={15} aria-hidden="true" />
              Bookings
              {counts.pending + counts.confirmed > 0 ? (
                <span className={styles.navPillCount}>{counts.pending + counts.confirmed}</span>
              ) : null}
            </Link>
            <Link href="/driver/trips/" className={styles.topNavLink}>
              <Compass size={15} aria-hidden="true" />
              Trips
            </Link>
            <Link href="/driver/vehicle/" className={styles.topNavLink}>
              <Car size={15} aria-hidden="true" />
              Vehicle
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

        {/* PAGE HEADER */}
        <header className={styles.heroCard}>
          <div className={styles.heroCopy}>
            <div className={styles.eyebrowRow}>
              <span className={styles.eyebrow}>
                <ClipboardList size={13} aria-hidden="true" />
                Driver bookings &amp; verification
              </span>
            </div>
            <h1 className={styles.heroTitle}>Assigned &amp; Public Pending Bookings</h1>
            <p className={styles.heroLead}>
              Hi {driverName} — review pending bookings assigned to you or shared publicly by
              companies, confirm to notify the customer and company, then tap{" "}
              <strong>Start trip</strong> to open live pickup navigation.
            </p>
          </div>
          <div className={styles.heroActions}>
            {activeRouteHref ? (
              <Link href={activeRouteHref} className={styles.linkPrimary}>
                Resume active trip
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            ) : null}
          </div>
        </header>

        {/* FILTER & SEARCH BAR */}
        <section className={styles.filterBar} aria-label="Filter bookings">
          <div className={styles.filterTabs} role="tablist" aria-label="Booking status filter">
            {(
              [
                { id: "all", label: `All (${counts.all})` },
                { id: "pending", label: `Pending (${counts.pending})` },
                { id: "public", label: `Public (${counts.publicPending})` },
                { id: "confirmed", label: `Confirmed (${counts.confirmed})` },
                { id: "active", label: `In progress (${counts.active})` },
                { id: "completed", label: `Completed (${counts.completed})` },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={filter === item.id}
                className={`${styles.filterChip} ${
                  filter === item.id ? styles.filterChipActive : ""
                }`}
                onClick={() => setFilter(item.id)}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ref, customer, origin, destination…"
              aria-label="Search bookings"
            />
          </div>
        </section>

        {/* BOOKING CARDS LIST */}
        {loading ? (
          <div className={styles.stateCard}>
            <LoaderCircle size={28} className={styles.spin} aria-hidden="true" />
            <p>Loading your bookings…</p>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className={styles.stateCard}>
            <span className={styles.stateIcon} aria-hidden="true">
              <Truck size={28} />
            </span>
            <h2>No bookings match this view</h2>
            <p>
              {filter !== "all" || search.trim()
                ? "Try switching back to All bookings or clearing your search query."
                : `When ${companyName} assigns a booking to you or a company shares a pending booking publicly, it will appear here ready for confirmation.`}
            </p>
            {filter !== "all" || search.trim() ? (
              <div className={styles.stateActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => {
                    setFilter("all");
                    setSearch("");
                  }}
                >
                  Show all bookings
                </button>
              </div>
            ) : null}
          </div>
        ) : (
          <section className={styles.bookingList} aria-label="Booking trips">
            {filteredBookings.map((booking) => {
              const stage = resolveDriverStage(booking);
              const isPublicPending = stage === "pending" && booking.is_public;
              const isUnclaimedPublicOffer =
                stage === "pending" &&
                Boolean(booking.is_public_offer ?? (booking.is_public && !booking.driver));
              const isLive = isActiveExecutionStage(stage);
              const vehicle = booking.vehicle ?? booking.service?.vehicle;
              const phoneHref = formatPhoneHref(booking.phone);
              const stageHref = driverStageRoute(booking.id, stage);
              const confirmingThis = busyKey === `confirm-${booking.id}`;
              const startingThis = busyKey === `start-${booking.id}`;

              return (
                <article className={styles.bookingCard} key={booking.id}>
                  <div className={styles.bookingCardTop}>
                    <div className={styles.bookingIdentity}>
                      <span className={styles.bookingIcon} aria-hidden="true">
                        <Car size={20} />
                      </span>
                      <div>
                        <span className={styles.bookingRef}>
                          {booking.reference || `Booking #${booking.id}`}
                        </span>
                        <h2 className={styles.bookingTitle}>
                          {booking.service?.title || "Private hire transfer"}
                        </h2>
                      </div>
                    </div>

                    <div className={styles.badgeGroup}>
                      {booking.company?.name ? (
                        <span className={styles.companyTag}>
                          <Building2 size={12} aria-hidden="true" />
                          {booking.company.name}
                        </span>
                      ) : null}
                      {isPublicPending ? (
                        <span className={styles.companyTag}>
                          <Radio size={12} aria-hidden="true" />
                          Public booking
                        </span>
                      ) : null}
                      <span
                        className={`${styles.statusBadge} ${
                          stage === "pending"
                            ? styles.statusPending
                            : stage === "confirmed"
                              ? styles.statusConfirmed
                              : isLive
                                ? styles.statusLive
                                : styles.statusCompleted
                        }`}
                      >
                        {DRIVER_STAGE_LABELS[stage]}
                      </span>
                    </div>
                  </div>

                  {/* Origin -> Destination Route */}
                  <div className={styles.routeBox}>
                    <div className={styles.routeStop}>
                      <span className={styles.stopPinA} aria-hidden="true">
                        A
                      </span>
                      <div className={styles.stopCopy}>
                        <span className={styles.stopLabel}>Pickup origin</span>
                        <span className={styles.stopValue}>
                          {booking.origin || "Origin to be confirmed with passenger"}
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
                          {booking.destination || "Destination to be confirmed with passenger"}
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

                  {/* Metadata Grid */}
                  <div className={styles.metaGrid}>
                    <div className={styles.metaItem}>
                      <CalendarDays size={15} aria-hidden="true" />
                      <div>
                        <span>Travel date</span>
                        <strong>{formatShortDate(booking.travel_date)}</strong>
                      </div>
                    </div>
                    <div className={styles.metaItem}>
                      <Clock3 size={15} aria-hidden="true" />
                      <div>
                        <span>Pickup time</span>
                        <strong>{booking.pickup_time || "Arrange with customer"}</strong>
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
                      <Users size={15} aria-hidden="true" />
                      <div>
                        <span>{isUnclaimedPublicOffer ? "Customer (after confirm)" : "Customer"}</span>
                        <strong>{booking.full_name || "Customer"}</strong>
                      </div>
                    </div>
                  </div>

                  {/* Direct contact pills once assigned */}
                  {!isUnclaimedPublicOffer && (phoneHref || booking.email) ? (
                    <div className={styles.contactActions}>
                      {phoneHref ? (
                        <a href={phoneHref} className={styles.contactPillLink}>
                          <Phone size={14} aria-hidden="true" />
                          {booking.phone}
                        </a>
                      ) : null}
                      {booking.email ? (
                        <a href={`mailto:${booking.email}`} className={styles.contactPillLink}>
                          <Mail size={14} aria-hidden="true" />
                          {booking.email}
                        </a>
                      ) : null}
                    </div>
                  ) : null}

                  {booking.notes ? (
                    <p className={styles.notesCallout}>{booking.notes}</p>
                  ) : null}

                  {/* STAGE-SPECIFIC ACTION FOOTER */}
                  <footer className={styles.bookingFooter}>
                    {stage === "pending" ? (
                      <>
                        <span className={styles.footerHint}>
                          {booking.company?.name
                            ? `Confirm to notify the customer and mark verified for ${booking.company.name}.`
                            : "Confirm to claim this booking and notify the customer."}
                        </span>
                        <div className={styles.footerActions}>
                          <button
                            type="button"
                            className={styles.btnPrimary}
                            disabled={confirmingThis}
                            onClick={() => void handleConfirmBooking(booking)}
                          >
                            {confirmingThis ? (
                              <LoaderCircle size={16} className={styles.spin} aria-hidden="true" />
                            ) : (
                              <Check size={16} aria-hidden="true" />
                            )}
                            Confirm trip
                          </button>
                        </div>
                      </>
                    ) : stage === "confirmed" ? (
                      <>
                        <span className={`${styles.footerHint} ${styles.footerHintVerified}`}>
                          <CheckCircle2 size={15} aria-hidden="true" />
                          Verified
                          {booking.confirmed_at ? ` at ${formatClockTime(booking.confirmed_at)}` : ""}{" "}
                          · Customer{booking.company?.name ? ` & ${booking.company.name}` : ""}{" "}
                          notified
                        </span>
                        <div className={styles.footerActions}>
                          <button
                            type="button"
                            className={styles.btnEmerald}
                            disabled={startingThis}
                            onClick={() => void handleStartTrip(booking)}
                          >
                            {startingThis ? (
                              <LoaderCircle size={16} className={styles.spin} aria-hidden="true" />
                            ) : (
                              <Play size={15} aria-hidden="true" />
                            )}
                            Start trip
                          </button>
                        </div>
                      </>
                    ) : isLive ? (
                      <>
                        <span className={styles.footerHint}>
                          <Navigation size={15} aria-hidden="true" />
                          Current stage: <strong>{DRIVER_STAGE_LABELS[stage]}</strong>
                        </span>
                        <div className={styles.footerActions}>
                          <Link href={stageHref} className={styles.linkPrimary}>
                            Continue live trip
                            <ArrowRight size={15} aria-hidden="true" />
                          </Link>
                        </div>
                      </>
                    ) : stage === "completed" ? (
                      <span className={`${styles.footerHint} ${styles.footerHintVerified}`}>
                        <CheckCircle2 size={15} aria-hidden="true" />
                        Trip completed
                        {booking.completed_at
                          ? ` on ${formatShortDate(booking.completed_at, false)} at ${formatClockTime(
                              booking.completed_at,
                            )}`
                          : ""}
                      </span>
                    ) : null}
                  </footer>
                </article>
              );
            })}
          </section>
        )}

        {/* PUBLIC OPEN CUSTOMER TRIP REQUESTS (FOR PUBLIC DRIVERS) */}
        {isPublicDriver && (openRequests.length > 0 || acceptedRequests.length > 0) ? (
          <section className={styles.panel} aria-labelledby="public-requests-heading">
            <header className={styles.panelHead}>
              <div className={styles.panelHeadCopy}>
                <span className={styles.eyebrow}>Direct marketplace</span>
                <h2 id="public-requests-heading" className={styles.panelTitle}>
                  Customer trip requests ({openRequests.length} open · {acceptedRequests.length}{" "}
                  accepted)
                </h2>
              </div>
            </header>

            <div className={styles.bookingList}>
              {[...openRequests.map((r) => ({ req: r, assigned: false })), ...acceptedRequests.map((r) => ({ req: r, assigned: true }))].map(
                ({ req, assigned }) => {
                  const date = req.travel_date ?? req.travelDate;
                  const contactName = req.contact_name ?? req.contactName ?? "Customer";
                  const contactPhone = req.contact_phone ?? req.contactPhone;
                  const tel = formatPhoneHref(contactPhone);
                  return (
                    <article className={styles.bookingCard} key={`req-${req.id}`}>
                      <div className={styles.bookingCardTop}>
                        <div className={styles.bookingIdentity}>
                          <span className={styles.bookingIcon} aria-hidden="true">
                            <MapPin size={19} />
                          </span>
                          <div>
                            <span className={styles.bookingRef}>Direct request #{req.id}</span>
                            <h3 className={styles.bookingTitle}>
                              {req.origin} → {req.destination}
                            </h3>
                          </div>
                        </div>
                        <span
                          className={`${styles.statusBadge} ${
                            assigned ? styles.statusConfirmed : styles.statusPending
                          }`}
                        >
                          {assigned ? "Assigned to you" : "Open request"}
                        </span>
                      </div>

                      <div className={styles.metaGrid}>
                        <div className={styles.metaItem}>
                          <CalendarDays size={15} aria-hidden="true" />
                          <div>
                            <span>Travel date</span>
                            <strong>{formatShortDate(date)}</strong>
                          </div>
                        </div>
                        <div className={styles.metaItem}>
                          <Users size={15} aria-hidden="true" />
                          <div>
                            <span>Passengers &amp; luggage</span>
                            <strong>
                              {req.passengers} pax · {req.luggage} bags
                            </strong>
                          </div>
                        </div>
                      </div>

                      {assigned ? (
                        <div className={styles.contactActions}>
                          <span className={styles.companyTag}>{contactName}</span>
                          {tel ? (
                            <a href={tel} className={styles.contactPillLink}>
                              <Phone size={14} aria-hidden="true" />
                              {contactPhone}
                            </a>
                          ) : null}
                        </div>
                      ) : (
                        <footer className={styles.bookingFooter}>
                          <span className={styles.footerHint}>
                            First approved driver to accept claims this request.
                          </span>
                          <button
                            type="button"
                            className={styles.btnPrimary}
                            disabled={busyKey === `req-${req.id}`}
                            onClick={() => void handleAcceptRequest(req)}
                          >
                            {busyKey === `req-${req.id}` ? (
                              <LoaderCircle size={15} className={styles.spin} aria-hidden="true" />
                            ) : (
                              <Check size={15} aria-hidden="true" />
                            )}
                            Accept request
                          </button>
                        </footer>
                      )}
                    </article>
                  );
                },
              )}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
