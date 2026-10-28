"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { companyAPI } from "@/lib/api/client";
import {
  ArrowLeft,
  Building2,
  CalendarDays,
  CheckCircle,
  Clock,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  User,
  Users,
  XCircle,
} from "@/components/icons";
import { useToast } from "@/components/ToastProvider";
import { getImageUrl } from "@/lib/utils/image-url";
import styles from "@/features/pages/company-operations.module.css";

type BookingStatus = "pending" | "confirmed" | "cancelled";

type HistoryEntry = {
  id: number;
  action: string;
  before: unknown;
  after: unknown;
  actor: { id: number; username: string } | null;
  created_at: string | null;
};

type BookingDetail = {
  id: number;
  reference: string | null;
  full_name: string;
  email: string;
  phone: string;
  address: string | null;
  travelers: number;
  travel_date: string | null;
  notes: string | null;
  status: BookingStatus;
  created_at: string | null;
  tour: number | null;
  tour_title: string | null;
  tour_price: string | null;
  tour_destination: string | null;
  total_price: number | null;
  tour_image: string | null;
  google_maps_url: string | null;
  allowed_transitions: BookingStatus[];
  status_history: HistoryEntry[];
};

function formatDate(value: string | null, withTime = false) {
  if (!value) return "Not set";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    ...(withTime
      ? { hour: "numeric" as const, minute: "2-digit" as const }
      : {}),
    timeZone: dateOnly ? "UTC" : undefined,
  });
}

function formatPrice(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "Not available";
  return `$${Math.round(value).toLocaleString("en-US")}`;
}

function statusFrom(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const status = (value as { status?: unknown }).status;
  return typeof status === "string" ? status : null;
}

function statusBadge(status: BookingStatus) {
  if (status === "confirmed") return styles.badgeConfirmed;
  if (status === "cancelled") return styles.badgeCancelled;
  return styles.badgePending;
}

function apiMessage(error: unknown) {
  if (typeof error === "object" && error) {
    const candidate = error as {
      response?: { data?: { message?: string }; status?: number };
    };
    return candidate.response?.data?.message || "The booking could not be updated.";
  }
  return "The booking could not be updated.";
}

export default function CompanyBookingDetailPage({
  bookingId,
}: {
  bookingId: number;
}) {
  const toast = useToast();
  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<BookingStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    return companyAPI
      .booking(bookingId)
      .then((response) => {
        setBooking(response.data as BookingDetail);
        setError(null);
      })
      .catch(() => {
        setError("This company booking could not be loaded.");
      })
      .finally(() => setLoading(false));
  }, [bookingId]);

  useEffect(() => {
    void load();
  }, [load]);

  const retry = () => {
    setLoading(true);
    void load();
  };

  const changeStatus = async (next: BookingStatus) => {
    if (!booking) return;
    if (
      next === "cancelled" &&
      !window.confirm(
        "Cancel this booking? The record and its status history will be kept.",
      )
    ) {
      return;
    }
    setBusy(next);
    try {
      const response = await companyAPI.updateBookingStatus(booking.id, next);
      setBooking(response.data as BookingDetail);
      toast.success(
        next === "confirmed" ? "Booking confirmed." : "Booking cancelled.",
      );
    } catch (updateError) {
      toast.error(apiMessage(updateError));
      void load();
    } finally {
      setBusy(null);
    }
  };

  if (loading) {
    return (
      <div className={`page ${styles.pageStack} ${styles.bookingDetailTheme}`}>
        <div className={styles.loading} role="status">
          Loading company booking...
        </div>
      </div>
    );
  }

  if (!booking || error) {
    return (
      <div className={`page ${styles.pageStack} ${styles.bookingDetailTheme}`}>
        <div className={styles.empty} role="alert">
          <span className={styles.emptyIcon}>
            <Building2 size={20} />
          </span>
          <h1 className={styles.emptyTitle}>Booking unavailable</h1>
          <p className={styles.emptyCopy}>
            {error || "This booking is not available in the active company."}
          </p>
          <div className={styles.pageActions}>
            <Link className="btn btn-outline btn-sm" href="/company/bookings/">
              Back to bookings
            </Link>
            <button className="btn btn-primary btn-sm" type="button" onClick={retry}>
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  const image = getImageUrl(booking.tour_image);
  const history = Array.isArray(booking.status_history)
    ? booking.status_history
    : [];
  const transitions = Array.isArray(booking.allowed_transitions)
    ? booking.allowed_transitions
    : [];

  return (
    <div className={`page ${styles.pageStack} ${styles.bookingDetailTheme}`}>
      <div className={styles.pageHead}>
        <div className={styles.pageTitleWrap}>
          <Link className={styles.panelLink} href="/company/bookings/">
            <ArrowLeft size={15} /> Back to bookings
          </Link>
          <h1 className={styles.pageTitle}>
            {booking.reference || `Booking ${booking.id}`}
          </h1>
          <p className={styles.pageLead}>
            {booking.full_name} · {booking.travelers} traveler
            {booking.travelers === 1 ? "" : "s"} ·{" "}
            {formatDate(booking.travel_date)}
          </p>
        </div>
        <div className={styles.pageActions}>
          <span
            className={`${styles.badge} ${statusBadge(booking.status)}`}
          >
            {booking.status}
          </span>
        </div>
      </div>

      <div className={styles.detailGrid}>
        <div className={styles.detailStack}>
          <section className={`glass-card ${styles.panel}`}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Selected tour</h2>
                <p className={styles.panelCopy}>
                  The tour attached to this booking record.
                </p>
              </div>
            </div>
            <div className={styles.listItem}>
              <div className={styles.listMain}>
                <span className={styles.listTitle}>
                  {booking.tour_title || "Tour unavailable"}
                </span>
                <span className={styles.listSub}>
                  <MapPin size={12} />{" "}
                  {booking.tour_destination || "Destination not set"} ·{" "}
                  {formatPrice(booking.total_price)} total
                </span>
              </div>
              {image ? (
                <Image
                  src={image}
                  alt=""
                  width={104}
                  height={78}
                  className={styles.tourThumb}
                />
              ) : (
                <span className={styles.emptyIcon}>
                  <MapPin size={18} />
                </span>
              )}
            </div>
          </section>

          <section className={`glass-card ${styles.panel}`}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Guest and travel details</h2>
                <p className={styles.panelCopy}>
                  Operational contact information for this booking only.
                </p>
              </div>
            </div>
            <div className={styles.summaryGrid}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Guest</span>
                <span className={styles.summaryValue}>{booking.full_name}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Email</span>
                <a className={styles.summaryValue} href={`mailto:${booking.email}`}>
                  <Mail size={13} /> {booking.email}
                </a>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Phone</span>
                <a className={styles.summaryValue} href={`tel:${booking.phone}`}>
                  <Phone size={13} /> {booking.phone}
                </a>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Travel date</span>
                <span className={styles.summaryValue}>
                  <CalendarDays size={13} /> {formatDate(booking.travel_date)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Travelers</span>
                <span className={styles.summaryValue}>
                  <Users size={13} /> {booking.travelers}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Booking created</span>
                <span className={styles.summaryValue}>
                  <Clock size={13} /> {formatDate(booking.created_at, true)}
                </span>
              </div>
              <div className={`${styles.summaryItem} ${styles.formFieldFull}`}>
                <span className={styles.summaryLabel}>Pickup address</span>
                <span className={styles.summaryValue}>
                  {booking.address || "Not provided"}
                </span>
                {booking.google_maps_url ? (
                  <a
                    className={styles.panelLink}
                    href={booking.google_maps_url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open map <ExternalLink size={13} />
                  </a>
                ) : null}
              </div>
            </div>
          </section>

          <section className={`glass-card ${styles.panel}`}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Guest notes</h2>
                <p className={styles.panelCopy}>
                  Operational notes supplied with the booking.
                </p>
              </div>
            </div>
            {booking.notes ? (
              <p className={styles.note}>{booking.notes}</p>
            ) : (
              <p className={styles.emptyInline}>No operational notes.</p>
            )}
          </section>

          <section className={`glass-card ${styles.panel}`}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Status history</h2>
                <p className={styles.panelCopy}>
                  Audited status changes are retained with the booking.
                </p>
              </div>
            </div>
            {history.length === 0 ? (
              <p className={styles.emptyInline}>
                No status changes have been recorded yet.
              </p>
            ) : (
              <ol className={styles.timeline}>
                {history.map((entry) => {
                  const before = statusFrom(entry.before);
                  const after = statusFrom(entry.after);
                  return (
                    <li className={styles.timelineItem} key={entry.id}>
                      <span className={styles.timelineDot} />
                      <div className={styles.timelineBody}>
                        <p className={styles.timelineTitle}>
                          {before && after
                            ? `Status changed from ${before} to ${after}`
                            : entry.action.replace(/[._]/g, " ")}
                        </p>
                        <p className={styles.timelineMeta}>
                          {entry.actor?.username
                            ? `By ${entry.actor.username}`
                            : "System"}{" "}
                          · {formatDate(entry.created_at, true)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </section>
        </div>

        <div className={styles.detailStack}>
          <section className={`glass-card ${styles.panel}`}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Booking actions</h2>
                <p className={styles.panelCopy}>
                  Only transitions allowed from the current status are shown.
                </p>
              </div>
            </div>
            {transitions.length === 0 ? (
              <p className={styles.actionNote}>
                No further status changes are available for a cancelled
                booking.
              </p>
            ) : (
              <div className={styles.transitionList}>
                {transitions.includes("confirmed") && (
                  <button
                    className={`btn btn-success ${styles.transitionButton}`}
                    type="button"
                    onClick={() => changeStatus("confirmed")}
                    disabled={busy !== null}
                  >
                    <CheckCircle size={16} />
                    {busy === "confirmed" ? "Confirming..." : "Confirm booking"}
                  </button>
                )}
                {transitions.includes("cancelled") && (
                  <button
                    className={`btn btn-danger ${styles.transitionButton}`}
                    type="button"
                    onClick={() => changeStatus("cancelled")}
                    disabled={busy !== null}
                  >
                    <XCircle size={16} />
                    {busy === "cancelled" ? "Cancelling..." : "Cancel booking"}
                  </button>
                )}
              </div>
            )}
            <p className={styles.actionNote}>
              Status changes are audited and cannot be reversed. Company staff
              cannot delete historical bookings.
            </p>
          </section>

          <section className={`glass-card ${styles.panel}`}>
            <div className={styles.panelHead}>
              <div>
                <h2 className={styles.panelTitle}>Record</h2>
              </div>
            </div>
            <dl className={styles.factList}>
              <div className={styles.fact}>
                <dt className={styles.factLabel}>Reference</dt>
                <dd className={styles.factValue}>
                  {booking.reference || `#${booking.id}`}
                </dd>
              </div>
              <div className={styles.fact}>
                <dt className={styles.factLabel}>Booking ID</dt>
                <dd className={styles.factValue}>#{booking.id}</dd>
              </div>
              <div className={styles.fact}>
                <dt className={styles.factLabel}>Tour</dt>
                <dd className={styles.factValue}>
                  {booking.tour_title || "Unavailable"}
                </dd>
              </div>
              <div className={styles.fact}>
                <dt className={styles.factLabel}>Total</dt>
                <dd className={styles.factValue}>
                  {formatPrice(booking.total_price)}
                </dd>
              </div>
              <div className={styles.fact}>
                <dt className={styles.factLabel}>Traveler</dt>
                <dd className={styles.factValue}>
                  <User size={12} /> {booking.travelers}
                </dd>
              </div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
