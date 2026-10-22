"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { companyAPI } from "@/lib/api/client";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  Search,
} from "@/components/icons";
import styles from "@/features/pages/company-operations.module.css";

const PAGE_SIZE = 15;

type BookingRow = {
  id: number;
  reference: string | null;
  full_name: string;
  email: string;
  phone: string;
  travelers: number;
  travel_date: string | null;
  status: "pending" | "confirmed" | "cancelled";
  tour: number;
  tour_title: string | null;
  tour_destination: string | null;
  total_price: number | null;
  created_at: string | null;
};

type TourOption = { id: number; title: string };

function statusBadge(status: string) {
  if (status === "confirmed") return styles.badgeConfirmed;
  if (status === "cancelled") return styles.badgeCancelled;
  return styles.badgePending;
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const date = new Date(dateOnly ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: dateOnly ? "UTC" : undefined,
  });
}

export default function CompanyBookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [tours, setTours] = useState<TourOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [tour, setTour] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    companyAPI
      .tours({})
      .then((response) => {
        if (cancelled) return;
        const payload = response.data;
        const rows = Array.isArray(payload) ? payload : payload.results ?? [];
        setTours(
          rows.map((item: { id: number; title: string }) => ({
            id: item.id,
            title: item.title,
          })),
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await companyAPI.bookings({
          page,
          page_size: PAGE_SIZE,
          ...(search.trim() ? { search: search.trim() } : {}),
          ...(status ? { status } : {}),
          ...(tour ? { tour } : {}),
          ...(travelDate ? { travel_date: travelDate } : {}),
        });
        if (cancelled) return;
        const payload = response.data;
        const rows: BookingRow[] = Array.isArray(payload)
          ? payload
          : payload.results ?? [];
        const countHeader = Number(response.headers["x-total-count"]);
        setBookings(rows);
        setTotal(
          Number.isFinite(countHeader) && countHeader >= 0
            ? countHeader
            : Array.isArray(payload)
              ? rows.length
              : Number(payload.count ?? rows.length),
        );
      } catch {
        if (cancelled) return;
        setBookings([]);
        setTotal(0);
        setError("Company bookings could not be loaded. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, search ? 300 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [page, search, status, tour, travelDate, reloadKey]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(search || status || tour || travelDate);

  return (
    <div className={`page ${styles.pageStack}`}>
      <div className={styles.pageHead}>
        <div className={styles.pageTitleWrap}>
          <p className={styles.eyebrow}>Company workspace</p>
          <h1 className={styles.pageTitle}>Bookings</h1>
          <p className={styles.pageLead}>
            Search and operate this company&apos;s booking queue. Contact details
            are shown only for delivering the selected booking.
          </p>
        </div>
        <div className={styles.pageActions}>
          <span className={styles.pill}>
            <ClipboardList size={13} /> {total} result{total === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.searchField}>
          <Search size={17} />
          <span className="sr-only">Search company bookings</span>
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Reference, guest, email, phone or tour"
          />
        </label>
        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Status</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </label>
        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Tour</span>
          <select
            value={tour}
            onChange={(event) => {
              setTour(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All tours</option>
            {tours.map((option) => (
              <option key={option.id} value={option.id}>
                {option.title}
              </option>
            ))}
          </select>
        </label>
        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Travel date</span>
          <input
            type="date"
            value={travelDate}
            onChange={(event) => {
              setTravelDate(event.target.value);
              setPage(1);
            }}
          />
        </label>
        <div className={styles.toolbarEnd}>
          {hasFilters ? (
            <button
              className="btn btn-ghost btn-sm"
              type="button"
              onClick={() => {
                setSearch("");
                setStatus("");
                setTour("");
                setTravelDate("");
                setPage(1);
              }}
            >
              <Filter size={14} /> Clear filters
            </button>
          ) : null}
        </div>
      </div>

      {error ? (
        <div className={styles.empty} role="alert">
          <span className={styles.emptyIcon}>
            <ClipboardList size={20} />
          </span>
          <h2 className={styles.emptyTitle}>Bookings unavailable</h2>
          <p className={styles.emptyCopy}>{error}</p>
          <button
            className="btn btn-outline btn-sm"
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
          >
            Try again
          </button>
        </div>
      ) : loading ? (
        <div className={styles.loading} role="status">
          Loading company bookings...
        </div>
      ) : bookings.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>
            <ClipboardList size={20} />
          </span>
          <h2 className={styles.emptyTitle}>No bookings found</h2>
          <p className={styles.emptyCopy}>
            {hasFilters
              ? "No bookings match the current filters. Clear a filter or try a different search."
              : "New customer bookings for this company will appear here."}
          </p>
        </div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Reference / guest</th>
                  <th scope="col">Tour</th>
                  <th scope="col">Travel date</th>
                  <th scope="col">Travelers</th>
                  <th scope="col">Status</th>
                  <th scope="col">Contact</th>
                  <th scope="col">Created</th>
                  <th scope="col">Action</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((booking) => (
                  <tr key={booking.id}>
                    <td>
                      <Link
                        className={styles.cellTitle}
                        href={`/company/bookings/${booking.id}/`}
                      >
                        {booking.reference || `Booking ${booking.id}`}
                      </Link>
                      <span className={styles.cellSub}>{booking.full_name}</span>
                    </td>
                    <td>
                      <span className={styles.cellTitle}>
                        {booking.tour_title || "Tour unavailable"}
                      </span>
                      <span className={styles.cellSub}>
                        {booking.tour_destination || ""}
                      </span>
                    </td>
                    <td className={styles.cellNowrap}>
                      {formatDate(booking.travel_date)}
                    </td>
                    <td>{booking.travelers}</td>
                    <td>
                      <span
                        className={`${styles.badge} ${statusBadge(
                          booking.status,
                        )}`}
                      >
                        {booking.status}
                      </span>
                    </td>
                    <td>
                      <span className={styles.cellSub}>{booking.email}</span>
                      <span className={styles.cellSub}>{booking.phone}</span>
                    </td>
                    <td className={styles.cellNowrap}>
                      {formatDate(booking.created_at)}
                    </td>
                    <td>
                      <Link
                        className="btn btn-outline btn-sm"
                        href={`/company/bookings/${booking.id}/`}
                      >
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className={styles.pagination}>
            <span className={styles.pageInfo}>
              Page {page} of {pages}
            </span>
            <button
              className="btn btn-outline btn-sm"
              type="button"
              onClick={() => setPage((value) => Math.max(1, value - 1))}
              disabled={page <= 1}
              aria-label="Previous page"
            >
              <ChevronLeft size={15} /> Previous
            </button>
            <button
              className="btn btn-outline btn-sm"
              type="button"
              onClick={() => setPage((value) => Math.min(pages, value + 1))}
              disabled={page >= pages}
              aria-label="Next page"
            >
              Next <ChevronRight size={15} />
            </button>
          </div>
        </>
      )}
    </div>
  );
}
