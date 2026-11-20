"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { CheckCircle2, LoaderCircle, MapPin, Navigation, Radio, RefreshCw, UserCheck } from "lucide-react";
import { companyTransportBookingsAPI } from "@/lib/api/client";
import { DRIVER_STAGE_LABELS, resolveDriverStage } from "@/lib/driver-workflow";
import { useToast } from "@/components/ToastProvider";
import styles from "@/features/pages/company-bookings.module.css";

type DispatchBooking = {
  id: number;
  reference: string | null;
  full_name: string;
  travel_date: string;
  pickup_time: string | null;
  passengers: number;
  status: string;
  driver_stage?: string | null;
  confirmed_at?: string | null;
  completed_at?: string | null;
  origin?: string | null;
  destination?: string | null;
  is_public: boolean;
  service: { title: string; vehicle?: { name: string; plate_number: string } | null } | null;
  vehicle?: { id: number; name: string; plate_number: string } | null;
  driver?: { id: number; name: string; phone?: string } | null;
};

type FilterTab = "all" | "verified" | "pending" | "completed";

export default function CompanyPublicDispatchPanel() {
  const toast = useToast();
  const [bookings, setBookings] = useState<DispatchBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [tab, setTab] = useState<FilterTab>("all");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await companyTransportBookingsAPI.getAll();
      setBookings(response.data?.results ?? []);
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Could not load transport trips.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const setPublic = async (booking: DispatchBooking, isPublic: boolean) => {
    setUpdatingId(booking.id);
    try {
      const response = await companyTransportBookingsAPI.setPublic(booking.id, isPublic);
      setBookings((current) =>
        current.map((item) => (item.id === booking.id ? response.data : item)),
      );
      toast.success(
        isPublic
          ? "Trip is now public. Previous driver and vehicle were unassigned while waiting for a driver to confirm."
          : "Trip is private again and restored to your company driver and vehicle.",
      );
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { message?: string } } };
      toast.error(axiosErr?.response?.data?.message || "Could not update trip visibility.");
    } finally {
      setUpdatingId(null);
    }
  };

  const counts = useMemo(() => {
    const verified = bookings.filter((b) =>
      ["confirmed", "in_progress"].includes(b.status),
    ).length;
    const pending = bookings.filter((b) => b.status === "pending").length;
    const completed = bookings.filter((b) => b.status === "completed").length;
    return { all: bookings.length, verified, pending, completed };
  }, [bookings]);

  const visibleBookings = useMemo(() => {
    if (tab === "verified") {
      return bookings.filter((b) => ["confirmed", "in_progress"].includes(b.status));
    }
    if (tab === "pending") {
      return bookings.filter((b) => b.status === "pending");
    }
    if (tab === "completed") {
      return bookings.filter((b) => b.status === "completed");
    }
    return bookings.filter((b) => b.status !== "cancelled");
  }, [bookings, tab]);

  return (
    <section className={styles.publicDispatch} aria-labelledby="public-dispatch-title">
      <header className={styles.publicDispatchHead}>
        <div>
          <p>Private hire &amp; driver verification</p>
          <h2 id="public-dispatch-title">Driver-verified trips &amp; public dispatch</h2>
          <span>
            Track bookings confirmed by your assigned drivers in real time, monitor active pickup
            and live journey stages, or share pending trips with approved public drivers.
          </span>
        </div>
        <button
          type="button"
          className={styles.publicDispatchRefresh}
          onClick={() => void load()}
          disabled={loading}
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </header>

      <div className={styles.publicDispatchTabs} role="tablist" aria-label="Filter private-hire trips">
        {(
          [
            { id: "all", label: `All (${counts.all})` },
            { id: "verified", label: `Verified & live (${counts.verified})` },
            { id: "pending", label: `Pending (${counts.pending})` },
            { id: "completed", label: `Completed (${counts.completed})` },
          ] as const
        ).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={`${styles.publicDispatchTab} ${
              tab === item.id ? styles.publicDispatchTabActive : ""
            }`}
            onClick={() => setTab(item.id)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.publicDispatchState}>
          <LoaderCircle className={styles.bookingsSpin} size={20} /> Loading transport trips…
        </div>
      ) : visibleBookings.length === 0 ? (
        <div className={styles.publicDispatchState}>
          {tab === "verified"
            ? "No driver-verified trips yet. Verified bookings appear here as soon as an assigned driver confirms."
            : "No private-hire trips match this filter yet."}
        </div>
      ) : (
        <div className={styles.publicDispatchList}>
          {visibleBookings.slice(0, 20).map((booking) => {
            const stage = resolveDriverStage(booking);
            const isVerifiedByDriver = ["confirmed", "in_progress", "completed"].includes(
              booking.status,
            );
            const routeText =
              booking.origin && booking.destination
                ? `${booking.origin} → ${booking.destination}`
                : booking.origin || booking.destination || null;

            return (
              <article className={styles.publicDispatchRow} key={booking.id}>
                <div className={styles.publicDispatchMain}>
                  <div className={styles.publicDispatchTitleRow}>
                    <strong>{booking.service?.title || "Private hire booking"}</strong>
                    {isVerifiedByDriver ? (
                      <span className={styles.publicDispatchVerified}>
                        <CheckCircle2 size={12} aria-hidden="true" />
                        {DRIVER_STAGE_LABELS[stage]}
                      </span>
                    ) : (
                      <span className={styles.publicDispatchPending}>Awaiting driver</span>
                    )}
                  </div>
                  <span>
                    {booking.reference || `Trip #${booking.id}`} · {booking.full_name} ·{" "}
                    {new Date(booking.travel_date).toLocaleDateString()}
                    {booking.pickup_time ? ` at ${booking.pickup_time}` : ""} ·{" "}
                    {booking.passengers} {booking.passengers === 1 ? "passenger" : "passengers"}
                  </span>
                  {routeText ? (
                    <span className={styles.publicDispatchRoute}>
                      <MapPin size={12} aria-hidden="true" />
                      {routeText}
                    </span>
                  ) : null}
                  {booking.driver ? (
                    <span className={styles.publicDispatchDriver}>
                      <UserCheck size={12} aria-hidden="true" />
                      Driver: {booking.driver.name}
                      {booking.driver.phone ? ` (${booking.driver.phone})` : ""}
                      {(booking.vehicle ?? booking.service?.vehicle)
                        ? ` · ${(booking.vehicle ?? booking.service?.vehicle)?.name} (${(booking.vehicle ?? booking.service?.vehicle)?.plate_number})`
                        : ""}
                      {booking.confirmed_at
                        ? ` · Verified ${new Date(booking.confirmed_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}`
                        : ""}
                    </span>
                  ) : booking.is_public && booking.status === "pending" ? (
                    <span className={styles.publicDispatchDriver}>
                      <Radio size={12} aria-hidden="true" />
                      Unassigned · Waiting for a driver &amp; vehicle to confirm
                    </span>
                  ) : null}
                </div>

                <div className={styles.publicDispatchAction}>
                  {booking.status === "in_progress" ? (
                    <span className={styles.publicDispatchLive}>
                      <Navigation size={12} aria-hidden="true" />
                      Live trip
                    </span>
                  ) : null}
                  <span className={booking.is_public ? styles.publicDispatchOn : styles.publicDispatchOff}>
                    {booking.is_public ? "Public driver offer" : "Company driver"}
                  </span>
                  {booking.status === "pending" ? (
                    <button
                      type="button"
                      disabled={updatingId === booking.id}
                      onClick={() => void setPublic(booking, !booking.is_public)}
                    >
                      {updatingId === booking.id ? (
                        <LoaderCircle className={styles.bookingsSpin} size={14} />
                      ) : (
                        <Radio size={14} />
                      )}
                      {booking.is_public ? "Make private" : "Share publicly"}
                    </button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
