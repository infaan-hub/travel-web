"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Car,
  Check,
  Clock3,
  LoaderCircle,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Truck,
  UserRound,
  Wallet,
} from "lucide-react";
import { driverAPI } from "@/lib/api/client";
import { useToast } from "@/components/ToastProvider";
import styles from "@/features/pages/driver-trips.module.css";

type TripStatus = "pending" | "confirmed" | "in_progress" | "completed" | "cancelled";

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
  status: TripStatus;
  is_public: boolean;
  notes: string;
  total_price: string | null;
  service: {
    title: string;
    description?: string;
    pricing_type?: string;
    vehicle: { name: string; plate_number: string; category: string; capacity?: number; luggage_capacity?: number } | null;
  } | null;
  vehicle: { name: string; plate_number: string; category: string; capacity?: number; luggage_capacity?: number } | null;
  company: { name: string; contact_phone?: string; contact_email?: string } | null;
};

type TripRequest = {
  id: number;
  origin: string;
  destination: string;
  origin_lat?: number | null;
  origin_lng?: number | null;
  dest_lat?: number | null;
  dest_lng?: number | null;
  travel_date?: string;
  travelDate?: string;
  passengers: number;
  luggage: number;
  notes: string;
  status: string;
  contact_name?: string | null;
  contact_email?: string | null;
  contact_phone?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
};

function dateLabel(value: string | undefined | null, withYear = true) {
  if (!value) return "Date to be confirmed";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Date to be confirmed";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

const statusLabel: Record<string, string> = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

export default function DriverTripsPage({
  driverName,
  isPublicDriver,
  companyName,
}: {
  driverName: string;
  isPublicDriver: boolean;
  companyName: string;
}) {
  const toast = useToast();
  const [bookings, setBookings] = useState<DriverBooking[]>([]);
  const [openRequests, setOpenRequests] = useState<TripRequest[]>([]);
  const [acceptedRequests, setAcceptedRequests] = useState<TripRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bookingsResponse, requestsResponse] = await Promise.all([
        driverAPI.getBookings(),
        driverAPI.getTripRequests(),
      ]);
      setBookings((bookingsResponse.data?.bookings ?? []) as DriverBooking[]);
      setOpenRequests((requestsResponse.data?.results ?? []) as TripRequest[]);
      setAcceptedRequests((requestsResponse.data?.assigned ?? []) as TripRequest[]);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not load your trips.");
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const assignedBookings = useMemo(() => bookings.filter((b) => !b.is_public || b.status !== "pending"), [bookings]);
  const publicBookings = useMemo(
    () => bookings.filter((b) => b.is_public && b.status === "pending"),
    [bookings],
  );
  const activeCount = useMemo(
    () => assignedBookings.filter((b) => ["confirmed", "in_progress"].includes(b.status)).length + acceptedRequests.length,
    [assignedBookings, acceptedRequests],
  );
  const awaitingCount = useMemo(
    () => publicBookings.length + openRequests.length + assignedBookings.filter((b) => b.status === "pending").length,
    [publicBookings, openRequests, assignedBookings],
  );

  const updateBooking = async (booking: DriverBooking, status: "confirmed" | "in_progress" | "completed") => {
    const key = `booking-${booking.id}`;
    setUpdatingId(key);
    try {
      const response = await driverAPI.updateBooking(booking.id, status);
      setBookings((current) =>
        current.map((item) =>
          item.id === booking.id ? ({ ...item, ...(response.data ?? {}) } as DriverBooking) : item,
        ),
      );
      toast.success(
        status === "confirmed"
          ? "Trip confirmed. The customer has been informed."
          : status === "in_progress"
            ? "Trip started."
            : "Trip marked complete.",
      );
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not update this trip.");
      void load();
    } finally {
      setUpdatingId(null);
    }
  };

  const acceptRequest = async (request: TripRequest) => {
    const key = `request-${request.id}`;
    setUpdatingId(key);
    try {
      await driverAPI.acceptTripRequest(request.id);
      toast.success("Trip request accepted. The customer has been informed.");
      void load();
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "This trip request is no longer available.");
      void load();
    } finally {
      setUpdatingId(null);
    }
  };

  const bookingCard = (booking: DriverBooking, isPublicOffer = false) => {
    const vehicle = booking.service?.vehicle ?? booking.vehicle;
    const driverNameShown = isPublicOffer ? "Assigned after confirmation" : null;
    return (
      <article className={styles.tripCard} key={`${isPublicOffer ? "public" : "assigned"}-${booking.id}`}>
        <div className={styles.tripTop}>
          <div className={styles.tripTitle}>
            <span className={styles.tripIcon}><Car size={19} /></span>
            <div>
              <span className={styles.bookingRef}>{booking.reference || `Booking #${booking.id}`}</span>
              <h3>{booking.service?.title || "Private hire trip"}</h3>
            </div>
          </div>
          <span className={`${styles.status} ${styles[`status_${booking.status}`]}`}>
            {isPublicOffer ? "Ready to claim" : (statusLabel[booking.status] ?? booking.status)}
          </span>
        </div>

        <div className={styles.detailGrid}>
          <div className={styles.detail}><CalendarDays size={16} /><div><span>Travel date</span><strong>{dateLabel(booking.travel_date)}</strong></div></div>
          {booking.end_date ? <div className={styles.detail}><CalendarDays size={16} /><div><span>End date</span><strong>{dateLabel(booking.end_date, false)}</strong></div></div> : null}
          <div className={styles.detail}><Clock3 size={16} /><div><span>Pickup time</span><strong>{booking.pickup_time || "To be arranged"}</strong></div></div>
          <div className={styles.detail}><UserRound size={16} /><div><span>Passengers</span><strong>{booking.passengers}</strong></div></div>
          {vehicle ? <div className={styles.detail}><Car size={16} /><div><span>Vehicle</span><strong>{vehicle.name} · {vehicle.plate_number}</strong><small>{vehicle.category}{vehicle.capacity ? ` · ${vehicle.capacity} seats` : ""}{vehicle.luggage_capacity !== undefined ? ` · ${vehicle.luggage_capacity} bags` : ""}</small></div></div> : null}
          {booking.total_price ? <div className={styles.detail}><Wallet size={16} /><div><span>Fare</span><strong>{Number(booking.total_price).toLocaleString()} TZS</strong></div></div> : null}
          <div className={styles.detail}><Truck size={16} /><div><span>Provided by</span><strong>{booking.company?.name || companyName}</strong><small>{driverNameShown || "Your vehicle and service"}</small></div></div>
        </div>

        <div className={styles.contactBlock}>
          <strong>{isPublicOffer ? "Customer (revealed on confirmation)" : "Passenger"}</strong>
          <span>{booking.full_name || "Customer"}</span>
          {booking.phone ? <a href={`tel:${booking.phone}`}><Phone size={13} /> {booking.phone}</a> : null}
          {booking.email ? <a href={`mailto:${booking.email}`}>{booking.email}</a> : null}
        </div>
        {booking.service?.description ? <p className={styles.notes}>{booking.service.description}</p> : null}
        {booking.notes ? <p className={styles.notes}>{booking.notes}</p> : null}

        {isPublicOffer || booking.status === "pending" ? (
          <footer className={styles.tripFooter}>
            <span>{isPublicOffer ? "Confirm to claim this trip and notify the customer." : "Confirm to accept this assignment."}</span>
            <button
              type="button"
              disabled={updatingId === `booking-${booking.id}`}
              onClick={() => void updateBooking(booking, "confirmed")}
            >
              {updatingId === `booking-${booking.id}` ? <LoaderCircle className={styles.spin} size={15} /> : <Check size={15} />}
              Confirm trip
            </button>
          </footer>
        ) : booking.status === "confirmed" ? (
          <footer className={styles.tripFooter}>
            <span>Confirmed · customer informed</span>
            <button type="button" disabled={updatingId === `booking-${booking.id}`} onClick={() => void updateBooking(booking, "in_progress")}>
              <Truck size={15} /> Start trip
            </button>
          </footer>
        ) : booking.status === "in_progress" ? (
          <footer className={styles.tripFooter}>
            <span>Trip in progress</span>
            <button type="button" disabled={updatingId === `booking-${booking.id}`} onClick={() => void updateBooking(booking, "completed")}>
              <Check size={15} /> Complete trip
            </button>
          </footer>
        ) : null}
      </article>
    );
  };

  const requestCard = (request: TripRequest, assigned: boolean) => {
    const date = request.travel_date ?? request.travelDate;
    const contactName = request.contact_name ?? request.contactName ?? "Customer";
    const contactPhone = request.contact_phone ?? request.contactPhone;
    const contactEmail = request.contact_email ?? request.contactEmail;
    return (
      <article className={styles.tripCard} key={`request-${request.id}`}>
        <div className={styles.tripTop}>
          <div className={styles.tripTitle}>
            <span className={styles.tripIcon}><Navigation size={19} /></span>
            <div>
              <span className={styles.bookingRef}>Customer request #{request.id}</span>
              <h3>{request.origin} → {request.destination}</h3>
            </div>
          </div>
          <span className={`${styles.status} ${assigned ? styles.status_confirmed : styles.status_pending}`}>
            {assigned ? "Assigned to you" : "Open request"}
          </span>
        </div>
        <div className={styles.detailGrid}>
          <div className={styles.detail}><CalendarDays size={16} /><div><span>Travel date</span><strong>{dateLabel(date)}</strong></div></div>
          <div className={styles.detail}><UserRound size={16} /><div><span>Passengers</span><strong>{request.passengers}</strong></div></div>
          <div className={styles.detail}><Car size={16} /><div><span>Luggage</span><strong>{request.luggage} bag(s)</strong></div></div>
          {request.origin_lat && request.origin_lng ? <div className={styles.detail}><MapPin size={16} /><div><span>Pickup coordinates</span><strong>{request.origin_lat}, {request.origin_lng}</strong></div></div> : null}
          {request.dest_lat && request.dest_lng ? <div className={styles.detail}><MapPin size={16} /><div><span>Destination coordinates</span><strong>{request.dest_lat}, {request.dest_lng}</strong></div></div> : null}
        </div>
        {request.notes ? <p className={styles.notes}>{request.notes}</p> : null}
        {assigned ? (
          <div className={styles.contactBlock}>
            <strong>Customer</strong>
            <span>{contactName}</span>
            {contactPhone ? <a href={`tel:${contactPhone}`}><Phone size={13} /> {contactPhone}</a> : null}
            {contactEmail ? <a href={`mailto:${contactEmail}`}>{contactEmail}</a> : null}
          </div>
        ) : (
          <footer className={styles.tripFooter}>
            <span>First approved driver to accept is assigned and the customer is notified.</span>
            <button type="button" disabled={updatingId === `request-${request.id}`} onClick={() => void acceptRequest(request)}>
              {updatingId === `request-${request.id}` ? <LoaderCircle className={styles.spin} size={15} /> : <Check size={15} />}
              Accept request
            </button>
          </footer>
        )}
      </article>
    );
  };

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <nav className={styles.breadcrumb} aria-label="Breadcrumb">
            <Link href="/">Home</Link><span>/</span>
            <Link href="/driver/dashboard/">Driver workspace</Link><span>/</span>
            <span>Trips</span>
          </nav>
          <p className={styles.eyebrow}>Private hire driver · {isPublicDriver ? "Public hire" : "Company driver"}</p>
          <h1>My trips, {driverName}</h1>
          <p className={styles.lead}>
            {isPublicDriver
              ? "Trips assigned by companies, trips released to the public, and direct customer requests — all in one place."
              : `Trips assigned to you by ${companyName}. Confirm a trip to inform the passenger.`}
          </p>
        </div>
        <button className={styles.refresh} type="button" onClick={() => void load()} disabled={loading}>
          <RefreshCw size={16} /> Refresh trips
        </button>
      </header>

      <section className={styles.summary} aria-label="Trip summary">
        <article><span>Awaiting your response</span><strong>{awaitingCount}</strong><small>Confirm to claim</small></article>
        <article><span>Active trips</span><strong>{activeCount}</strong><small>Confirmed or underway</small></article>
        <article><span>Assigned trips</span><strong>{assignedBookings.length + acceptedRequests.length}</strong><small>Your confirmed schedule</small></article>
      </section>

      {loading ? (
        <div className={styles.state}><LoaderCircle className={styles.spin} size={28} /><p>Loading your trips…</p></div>
      ) : (
        <>
          {isPublicDriver ? (
            <section className={styles.trips} aria-labelledby="open-requests">
              <div className={styles.sectionHeader}>
                <div><p className={styles.sectionKicker}>Open marketplace</p><h2 id="open-requests">Customer trip requests</h2></div>
                <span>{openRequests.length} open</span>
              </div>
              {openRequests.length === 0 ? (
                <div className={styles.state}><MapPin size={30} /><h3>No open requests</h3><p>New direct transport requests will appear here when customers submit them.</p></div>
              ) : (
                <div className={styles.tripList}>{openRequests.map((request) => requestCard(request, false))}</div>
              )}
            </section>
          ) : null}

          {publicBookings.length > 0 ? (
            <section className={styles.trips} aria-labelledby="public-trips">
              <div className={styles.sectionHeader}>
                <div><p className={styles.sectionKicker}>Released by companies</p><h2 id="public-trips">Public trips ready to claim</h2></div>
                <span>{publicBookings.length} available</span>
              </div>
              <div className={styles.tripList}>{publicBookings.map((booking) => bookingCard(booking, true))}</div>
            </section>
          ) : null}

          <section className={styles.trips} aria-labelledby="assigned-trips">
            <div className={styles.sectionHeader}>
              <div><p className={styles.sectionKicker}>Your schedule</p><h2 id="assigned-trips">Assigned trips</h2></div>
              <span>{assignedBookings.length} total</span>
            </div>
            {assignedBookings.length === 0 ? (
              <div className={styles.state}><Truck size={32} /><h3>No trips assigned yet</h3><p>When {companyName} assigns you a booking, it will appear here with full passenger and vehicle details.</p></div>
            ) : (
              <div className={styles.tripList}>{assignedBookings.map((booking) => bookingCard(booking))}</div>
            )}
          </section>

          {acceptedRequests.length > 0 ? (
            <section className={styles.trips} aria-labelledby="accepted-requests">
              <div className={styles.sectionHeader}>
                <div><p className={styles.sectionKicker}>Your assignments</p><h2 id="accepted-requests">Accepted customer requests</h2></div>
                <span>{acceptedRequests.length} assigned</span>
              </div>
              <div className={styles.tripList}>{acceptedRequests.map((request) => requestCard(request, true))}</div>
            </section>
          ) : null}
        </>
      )}
    </main>
  );
}
