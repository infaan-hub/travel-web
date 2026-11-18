"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays, Check, LoaderCircle, RefreshCw, Truck } from "lucide-react";
import { driverAPI } from "@/lib/api/client";
import { useToast } from "@/components/ToastProvider";
import styles from "@/features/pages/driver-dashboard.module.css";

type DriverBooking = {
  id: number;
  status: string;
  travel_date: string;
  full_name: string;
  service: { title: string } | null;
};

type TripRequest = { id: number };

export default function DriverDashboardPage({ driverName, companyName }: { driverName: string; companyName: string }) {
  const toast = useToast();
  const [bookings, setBookings] = useState<DriverBooking[]>([]);
  const [openRequests, setOpenRequests] = useState<TripRequest[]>([]);
  const [acceptedRequests, setAcceptedRequests] = useState<TripRequest[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [response, requestsResponse] = await Promise.all([
        driverAPI.getBookings(),
        driverAPI.getTripRequests(),
      ]);
      setBookings(response.data?.bookings ?? []);
      setOpenRequests(requestsResponse.data?.results ?? []);
      setAcceptedRequests(requestsResponse.data?.assigned ?? []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not load your trip summary.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const activeTrips = useMemo(
    () => bookings.filter((booking) => ["confirmed", "in_progress"].includes(booking.status)).length + acceptedRequests.length,
    [bookings, acceptedRequests],
  );
  const awaiting = useMemo(
    () => bookings.filter((booking) => booking.status === "pending").length + openRequests.length,
    [bookings, openRequests],
  );
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = useMemo(
    () => bookings.filter((booking) => booking.travel_date >= today && !["cancelled", "completed"].includes(booking.status)).length,
    [bookings, today],
  );

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>Driver workspace</span></nav>
          <p className={styles.eyebrow}>Private hire driver</p>
          <h1>Welcome, {driverName}</h1>
          <p className={styles.lead}>Your trips from {companyName} and direct customer requests are managed on one dedicated page.</p>
        </div>
        <button className={styles.refresh} type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Refresh</button>
      </header>

      <section className={styles.summary} aria-label="Trip summary">
        <article><span>Active trips</span><strong>{loading ? "…" : activeTrips}</strong><small>Confirmed or underway</small></article>
        <article><span>Upcoming</span><strong>{loading ? "…" : upcoming}</strong><small>Scheduled journeys</small></article>
        <article><span>Awaiting your response</span><strong>{loading ? "…" : awaiting}</strong><small>Confirm to accept a trip</small></article>
      </section>

      <section className={styles.trips} aria-labelledby="trips-link">
        <div className={styles.sectionHeader}>
          <div><p className={styles.sectionKicker}>Dispatch</p><h2 id="trips-link">Your trips</h2></div>
        </div>
        <div className={styles.state}>
          <Truck size={34} />
          <h3>View, confirm and manage all your trips</h3>
          <p>See trips assigned by your company, trips released to the public, and direct customer requests. Confirming a trip automatically informs the customer.</p>
          <Link href="/driver/dashboard/trips/" className={styles.refresh} style={{ textDecoration: "none" }}>
            Open my trips <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      <section className={styles.summary} aria-label="Quick status">
        <article><span>Assigned bookings</span><strong>{loading ? "…" : bookings.length}</strong><small><CalendarDays size={13} /> From company and public dispatch</small></article>
        <article><span>Accepted requests</span><strong>{loading ? "…" : acceptedRequests.length}</strong><small><Check size={13} /> Customer trip requests you claimed</small></article>
        <article><span>Open requests</span><strong>{loading ? "…" : openRequests.length}</strong><small><LoaderCircle size={13} /> Ready for an approved driver</small></article>
      </section>
    </main>
  );
}
