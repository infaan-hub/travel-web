"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, Car, Check, Clock3, LoaderCircle, MapPin, RefreshCw, Truck } from "lucide-react";
import { driverAPI } from "@/lib/api/client";
import { useToast } from "@/components/ToastProvider";
import styles from "@/features/pages/driver-dashboard.module.css";

type DriverBooking = {
  id: number;
  reference: string | null;
  full_name: string;
  phone: string;
  email: string;
  passengers: number;
  travel_date: string;
  end_date: string | null;
  pickup_time: string | null;
  status: "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";
  notes: string;
  total_price: string | null;
  service: { title: string; vehicle: { name: string; plate_number: string; category: string } | null } | null;
  company: { name: string } | null;
};

type DirectTripRequest = {
  id: number; origin: string; destination: string; travelDate: string; passengers: number; luggage: number;
  notes: string; status: string;
};
type AssignedTripRequest = DirectTripRequest & {
  contactName: string | null; contactEmail: string | null; contactPhone: string | null;
};

function dateLabel(value: string, withYear = true) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date to be confirmed" : date.toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric", ...(withYear ? { year: "numeric" } : {}), timeZone: "UTC",
  });
}

export default function DriverDashboardPage({ driverName, companyName }: { driverName: string; companyName: string }) {
  const toast = useToast();
  const [bookings, setBookings] = useState<DriverBooking[]>([]);
  const [openRequests, setOpenRequests] = useState<DirectTripRequest[]>([]);
  const [acceptedRequests, setAcceptedRequests] = useState<AssignedTripRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [response, requestsResponse] = await Promise.all([driverAPI.getBookings(), driverAPI.getTripRequests()]);
      setBookings(response.data?.bookings ?? []);
      setOpenRequests(requestsResponse.data?.results ?? []);
      setAcceptedRequests(requestsResponse.data?.assigned ?? []);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not load your assigned trips.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { void load(); }, [load]);

  const activeTrips = useMemo(() => bookings.filter((booking) => ["confirmed", "in_progress"].includes(booking.status)).length, [bookings]);
  const pendingTrips = useMemo(() => bookings.filter((booking) => booking.status === "pending").length, [bookings]);
  const today = new Date().toISOString().slice(0, 10);
  const upcomingTrips = useMemo(() => bookings.filter((booking) => booking.travel_date >= today && !["cancelled", "completed"].includes(booking.status)).length, [bookings, today]);

  const updateStatus = async (booking: DriverBooking, status: "confirmed" | "in_progress" | "completed") => {
    setUpdatingId(booking.id);
    try {
      const response = await driverAPI.updateBooking(booking.id, status);
      setBookings((current) => current.map((item) => item.id === booking.id ? response.data : item));
      toast.success(status === "confirmed" ? "Trip accepted." : status === "in_progress" ? "Trip started." : "Trip marked complete.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not update this trip.");
      void load();
    } finally {
      setUpdatingId(null);
    }
  };

  const acceptCustomerRequest = async (request: DirectTripRequest) => {
    setUpdatingId(request.id);
    try {
      await driverAPI.acceptTripRequest(request.id);
      setOpenRequests((current) => current.filter((item) => item.id !== request.id));
      void load();
      toast.success("Customer trip request accepted and assigned to you.");
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "This trip request is no longer available.");
      void load();
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb"><Link href="/">Home</Link><span>/</span><span>Driver workspace</span></nav>
          <p className={styles.eyebrow}>Private hire driver</p>
          <h1>Welcome, {driverName}</h1>
          <p className={styles.lead}>Your assigned trips and open direct requests from {companyName}.</p>
        </div>
        <button className={styles.refresh} type="button" onClick={() => void load()} disabled={loading}><RefreshCw size={16} /> Refresh trips</button>
      </header>

      <section className={styles.summary} aria-label="Trip summary">
        <article><span>Active trips</span><strong>{activeTrips + acceptedRequests.length}</strong><small>Confirmed or underway</small></article>
        <article><span>Upcoming</span><strong>{upcomingTrips}</strong><small>Scheduled journeys</small></article>
        <article><span>Awaiting your response</span><strong>{pendingTrips + openRequests.length}</strong><small>Assigned trips and customer requests</small></article>
      </section>

      <section className={styles.trips} aria-labelledby="customer-trip-requests">
        <div className={styles.sectionHeader}><div><p className={styles.sectionKicker}>Open marketplace</p><h2 id="customer-trip-requests">Direct customer requests</h2></div><span>{openRequests.length} open</span></div>
        {loading ? <div className={styles.state}><LoaderCircle className={styles.spin} size={24} /><p>Loading open requests…</p></div>
          : openRequests.length === 0 ? <div className={styles.state}><MapPin size={31} /><h3>No open customer requests</h3><p>New direct transport requests will be listed here when customers submit them.</p></div>
          : <div className={styles.tripList}>{openRequests.map((request) => <article className={styles.tripCard} key={request.id}>
            <div className={styles.tripTop}><div className={styles.tripTitle}><span className={styles.tripIcon}><MapPin size={19} /></span><div><span className={styles.bookingRef}>Customer request #{request.id}</span><h3>{request.origin} → {request.destination}</h3></div></div><span className={`${styles.status} ${styles.status_pending}`}>Open request</span></div>
            <div className={styles.tripDetails}><div><CalendarDays size={16} /><span>{dateLabel(request.travelDate)}</span></div><div><Car size={16} /><span>{request.passengers} passengers · {request.luggage} bags</span></div></div>
            {request.notes ? <p className={styles.notes}>{request.notes}</p> : null}
            <footer className={styles.tripFooter}><span>First approved driver to accept is assigned to this trip.</span><button type="button" disabled={updatingId === request.id} onClick={() => void acceptCustomerRequest(request)}>{updatingId === request.id ? <LoaderCircle className={styles.spin} size={15} /> : <Check size={15} />} Accept request</button></footer>
          </article>)}</div>}
      </section>

      {acceptedRequests.length > 0 ? <section className={styles.trips} aria-labelledby="accepted-customer-requests">
        <div className={styles.sectionHeader}><div><p className={styles.sectionKicker}>Your assignments</p><h2 id="accepted-customer-requests">Accepted customer requests</h2></div><span>{acceptedRequests.length} assigned</span></div>
        <div className={styles.tripList}>{acceptedRequests.map((request) => {
          const customerName = request.contactName || "Customer";
          return <article className={styles.tripCard} key={request.id}>
            <div className={styles.tripTop}><div className={styles.tripTitle}><span className={styles.tripIcon}><MapPin size={19} /></span><div><span className={styles.bookingRef}>Customer request #{request.id}</span><h3>{request.origin} → {request.destination}</h3></div></div><span className={`${styles.status} ${styles.status_confirmed}`}>Assigned</span></div>
            <div className={styles.tripDetails}><div><CalendarDays size={16} /><span>{dateLabel(request.travelDate)}</span></div><div><Car size={16} /><span>{request.passengers} passengers · {request.luggage} bags</span></div></div>
            <div className={styles.passenger}><strong>Customer</strong><span>{customerName}</span>{request.contactPhone ? <a href={`tel:${request.contactPhone}`}>{request.contactPhone}</a> : null}{request.contactEmail ? <a href={`mailto:${request.contactEmail}`}>{request.contactEmail}</a> : null}</div>
            {request.notes ? <p className={styles.notes}>{request.notes}</p> : null}
          </article>;
        })}</div>
      </section> : null}

      <section className={styles.trips} id="trips">
        <div className={styles.sectionHeader}><div><p className={styles.sectionKicker}>Dispatch</p><h2>Assigned trips</h2></div><span>{bookings.length} total</span></div>
        {loading ? <div className={styles.state}><LoaderCircle className={styles.spin} size={28} /><p>Loading assigned trips…</p></div>
          : bookings.length === 0 ? <div className={styles.state}><Truck size={34} /><h3>No trips assigned yet</h3><p>When {companyName} assigns you a booking, it will appear here with passenger and vehicle details.</p></div>
          : <div className={styles.tripList}>{bookings.map((booking) => <article className={styles.tripCard} key={booking.id}>
              <div className={styles.tripTop}>
                <div className={styles.tripTitle}><span className={styles.tripIcon}><Car size={19} /></span><div><span className={styles.bookingRef}>{booking.reference || `Booking #${booking.id}`}</span><h3>{booking.service?.title || "Private hire trip"}</h3></div></div>
                <span className={`${styles.status} ${styles[`status_${booking.status}`]}`}>{booking.status.replace("_", " ")}</span>
              </div>
              <div className={styles.tripDetails}>
                <div><CalendarDays size={16} /><span>{dateLabel(booking.travel_date)}{booking.end_date ? ` – ${dateLabel(booking.end_date, false)}` : ""}</span></div>
                {booking.pickup_time ? <div><Clock3 size={16} /><span>Pickup at {booking.pickup_time}</span></div> : null}
                {booking.service?.vehicle ? <div><Car size={16} /><span>{booking.service.vehicle.name} · {booking.service.vehicle.plate_number}</span></div> : null}
                <div><MapPin size={16} /><span>{booking.passengers} passenger{booking.passengers === 1 ? "" : "s"}</span></div>
              </div>
              <div className={styles.passenger}><strong>Passenger</strong><span>{booking.full_name}</span><a href={`tel:${booking.phone}`}>{booking.phone}</a><a href={`mailto:${booking.email}`}>{booking.email}</a></div>
              {booking.notes ? <p className={styles.notes}>{booking.notes}</p> : null}
              <footer className={styles.tripFooter}>
                <span>{booking.company?.name || companyName}{booking.total_price ? ` · ${Number(booking.total_price).toLocaleString()} TZS` : ""}</span>
                {booking.status === "confirmed" ? <button type="button" onClick={() => void updateStatus(booking, "in_progress")} disabled={updatingId === booking.id}>{updatingId === booking.id ? <LoaderCircle className={styles.spin} size={15} /> : <Truck size={15} />} Start trip</button>
                  : booking.status === "in_progress" ? <button type="button" onClick={() => void updateStatus(booking, "completed")} disabled={updatingId === booking.id}>{updatingId === booking.id ? <LoaderCircle className={styles.spin} size={15} /> : <Check size={15} />} Complete trip</button>
                  : booking.status === "pending" ? <button type="button" onClick={() => void updateStatus(booking, "confirmed")} disabled={updatingId === booking.id}>{updatingId === booking.id ? <LoaderCircle className={styles.spin} size={15} /> : <Check size={15} />} Accept trip</button>
                  : null}
              </footer>
            </article>)}</div>}
      </section>
    </main>
  );
}
