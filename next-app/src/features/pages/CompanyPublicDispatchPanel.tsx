"use client";

import { useCallback, useEffect, useState } from "react";
import { LoaderCircle, Radio, RefreshCw } from "lucide-react";
import { companyTransportBookingsAPI } from "@/lib/api/client";
import { useToast } from "@/components/ToastProvider";
import styles from "@/features/pages/company-bookings.module.css";

type DispatchBooking = {
  id: number; reference: string | null; full_name: string; travel_date: string; passengers: number;
  status: string; is_public: boolean; service: { title: string } | null;
};

export default function CompanyPublicDispatchPanel() {
  const toast = useToast();
  const [bookings, setBookings] = useState<DispatchBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const response = await companyTransportBookingsAPI.getAll();
      setBookings(response.data?.results ?? []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not load transport trips.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const setPublic = async (booking: DispatchBooking, isPublic: boolean) => {
    setUpdatingId(booking.id);
    try {
      const response = await companyTransportBookingsAPI.setPublic(booking.id, isPublic);
      setBookings((current) => current.map((item) => item.id === booking.id ? response.data : item));
      toast.success(isPublic ? "Trip shared with approved public drivers." : "Trip is limited to your assigned driver.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not update trip visibility.");
    } finally {
      setUpdatingId(null);
    }
  };

  const activeBookings = bookings.filter((booking) => !["completed", "cancelled"].includes(booking.status));

  return (
    <section className={styles.publicDispatch} aria-labelledby="public-dispatch-title">
      <header className={styles.publicDispatchHead}>
        <div><p>Driver network</p><h2 id="public-dispatch-title">Share trips with public drivers</h2><span>Only trips you mark public are offered to approved independent drivers. A driver who accepts becomes assigned to the trip.</span></div>
        <button type="button" className={styles.publicDispatchRefresh} onClick={() => void load()} disabled={loading}><RefreshCw size={15} /> Refresh</button>
      </header>
      {loading ? <div className={styles.publicDispatchState}><LoaderCircle className={styles.bookingsSpin} size={20} /> Loading transport trips…</div>
        : activeBookings.length === 0 ? <div className={styles.publicDispatchState}>No active private-hire trips are available to share yet.</div>
        : <div className={styles.publicDispatchList}>{activeBookings.slice(0, 12).map((booking) => <article className={styles.publicDispatchRow} key={booking.id}>
          <div><strong>{booking.service?.title || "Private hire booking"}</strong><span>{booking.reference || `Trip #${booking.id}`} · {booking.full_name} · {new Date(booking.travel_date).toLocaleDateString()} · {booking.passengers} passengers</span></div>
          <div className={styles.publicDispatchAction}>
            <span className={booking.is_public ? styles.publicDispatchOn : styles.publicDispatchOff}>{booking.is_public ? "Public driver offer" : "Company driver only"}</span>
            <button type="button" disabled={updatingId === booking.id || (!booking.is_public && booking.status !== "pending") || ["completed", "cancelled"].includes(booking.status)} onClick={() => void setPublic(booking, !booking.is_public)}>
              {updatingId === booking.id ? <LoaderCircle className={styles.bookingsSpin} size={14} /> : <Radio size={14} />}
              {booking.is_public ? "Make private" : "Share publicly"}
            </button>
          </div>
        </article>)}</div>}
    </section>
  );
}
