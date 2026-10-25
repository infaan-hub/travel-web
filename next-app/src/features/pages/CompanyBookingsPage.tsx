"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { companyAPI } from "@/lib/api/client";
import {
  AlertCircle,
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Filter,
  Mail,
  MapPin,
  Phone,
  RefreshCw,
  Search,
  Users,
  X,
} from "@/components/icons";
import styles from "@/features/pages/company-bookings.module.css";

const PAGE_SIZE = 15;
const SEARCH_DEBOUNCE = 300;

type BookingStatus = "pending" | "confirmed" | "cancelled";

type BookingRow = {
  id: number;
  reference: string | null;
  full_name: string;
  email: string;
  phone: string;
  travelers: number;
  travel_date: string | null;
  status: BookingStatus;
  tour: number;
  tour_title: string | null;
  tour_destination: string | null;
  total_price: number | null;
  created_at: string | null;
};

type TourOption = { id: number; title: string };

const STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "pending", label: "Pending" },
  { value: "confirmed", label: "Confirmed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

const STATUS_LABELS: Record<BookingStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  cancelled: "Cancelled",
};

function statusTone(status: BookingStatus) {
  if (status === "confirmed") return styles.bookingsStatusConfirmed;
  if (status === "cancelled") return styles.bookingsStatusCancelled;
  return styles.bookingsStatusPending;
}

function statusLabel(status: string) {
  return STATUS_LABELS[status as BookingStatus] ?? status;
}

function bookingReference(booking: BookingRow) {
  const reference = booking.reference?.trim();
  return reference || `Booking ${booking.id}`;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.charAt(0) ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1]?.charAt(0) ?? "" : "";
  return (first + last).toUpperCase() || "?";
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

function bookedLabel(value: string | null) {
  if (!value) return "Booking date unavailable";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Booking date unavailable";
  return `Booked ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

function formatPrice(value: number | null) {
  if (value === null) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

export default function CompanyBookingsPage() {
  const [bookings, setBookings] = useState<BookingRow[]>([]);
  const [tours, setTours] = useState<TourOption[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"" | BookingStatus>("");
  const [tour, setTour] = useState("");
  const [travelDate, setTravelDate] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const committedSearch = useRef("");

  useEffect(() => {
    let cancelled = false;
    companyAPI
      .tours({})
      .then((response) => {
        if (cancelled) return;
        const payload = response.data;
        const rows = Array.isArray(payload) ? payload : payload.results ?? [];
        const options = rows
          .map((item: { id: number; title: string }) => ({
            id: item.id,
            title: item.title,
          }))
          .sort((a: TourOption, b: TourOption) =>
            a.title.localeCompare(b.title, "en", { sensitivity: "base" }),
          );
        setTours(options);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const next = searchInput.trim();
    if (next === committedSearch.current) return;
    const timer = window.setTimeout(() => {
      committedSearch.current = next;
      setSearch(next);
      setPage(1);
    }, SEARCH_DEBOUNCE);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await companyAPI.bookings({
          page,
          page_size: PAGE_SIZE,
          ...(status ? { status } : {}),
          ...(tour ? { tour } : {}),
          ...(travelDate ? { travel_date: travelDate } : {}),
          ...(search ? { search } : {}),
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
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [page, status, tour, travelDate, search, reloadKey]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isFiltered = Boolean(search || status || tour || travelDate);
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(total, (page - 1) * PAGE_SIZE + bookings.length);
  const guestsInView = bookings.reduce(
    (sum, booking) => sum + (Number(booking.travelers) || 0),
    0,
  );

  const applySearch = (value: string) => {
    committedSearch.current = value;
    setSearchInput(value);
    setSearch(value);
    setPage(1);
  };

  const clearFilters = () => {
    applySearch("");
    setStatus("");
    setTour("");
    setTravelDate("");
  };

  const changeStatus = (value: "" | BookingStatus) => {
    setStatus(value);
    setPage(1);
  };

  const reviewPending = () => {
    changeStatus("pending");
  };

  const emptyTitle = search
    ? "No matching bookings"
    : isFiltered
      ? "No bookings match these filters"
      : "No bookings in the queue yet";
  const emptyCopy = search
    ? `No bookings match “${search}”${
        status || tour || travelDate ? " and the current filters" : ""
      }. Try a different reference, guest name, contact detail or tour.`
    : status || tour || travelDate
      ? "No bookings match the current filters. Clear a filter or pick another travel date."
      : "New customer bookings for this company will appear here. Pending requests are the first ones to review.";

  return (
    <div id="bookings-workspace" className={styles.bookingsRoot}>
      <header className={styles.bookingsMasthead}>
        <div className={styles.bookingsMastheadText}>
          <nav className={styles.bookingsBreadcrumb} aria-label="Breadcrumb">
            <Link href="/company/dashboard/">Company workspace</Link>
            <span className={styles.bookingsBreadcrumbSep} aria-hidden="true">
              /
            </span>
            <span className={styles.bookingsBreadcrumbCurrent}>Bookings</span>
          </nav>
          <p className={styles.bookingsEyebrow}>Company workspace</p>
          <h1 className={styles.bookingsTitle}>Bookings</h1>
          <p className={styles.bookingsLead}>
            Review and operate this company&apos;s booking queue. Contact
            details are shown only for delivering the selected booking.
          </p>
        </div>
        <div className={styles.bookingsActions}>
          <button
            className="btn btn-outline"
            type="button"
            onClick={() => setReloadKey((value) => value + 1)}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? styles.bookingsSpin : undefined}
            />
            Refresh
          </button>
        </div>
      </header>

      <section className={styles.bookingsHero} aria-label="Booking queue overview">
        <div className={styles.bookingsHeroMain}>
          <div className={styles.bookingsHeroHead}>
            <span className={styles.bookingsHeroIcon} aria-hidden="true">
              <ClipboardList size={23} />
            </span>
            <div>
              <h2 className={styles.bookingsHeroTitle}>Booking queue</h2>
              <p className={styles.bookingsHeroCopy}>
                Every reservation below belongs to your active company. Search
                by reference, guest or contact detail, then narrow the queue by
                status, tour or travel date before opening a booking.
              </p>
            </div>
          </div>
          <ul className={styles.bookingsStatRow}>
            <li className={styles.bookingsStat}>
              <span className={styles.bookingsStatLabel}>Results</span>
              <span className={styles.bookingsStatValue}>{total}</span>
              <span className={styles.bookingsStatHint}>
                {isFiltered ? "After search & filters" : "Whole queue"}
              </span>
            </li>
            <li className={styles.bookingsStat}>
              <span className={styles.bookingsStatLabel}>Page</span>
              <span className={styles.bookingsStatValue}>
                {page} / {pages}
              </span>
              <span className={styles.bookingsStatHint}>
                {PAGE_SIZE} bookings per page
              </span>
            </li>
            <li className={styles.bookingsStat}>
              <span className={styles.bookingsStatLabel}>Guests in view</span>
              <span className={styles.bookingsStatValue}>{guestsInView}</span>
              <span className={styles.bookingsStatHint}>
                Across these cards
              </span>
            </li>
          </ul>
        </div>
        <aside className={styles.bookingsAside}>
          <div className={styles.bookingsAsideMain}>
            <p className={styles.bookingsAsideLabel}>Queue size</p>
            <p className={styles.bookingsAsideValue}>
              {total} <span>booking{total === 1 ? "" : "s"}</span>
            </p>
            <p className={styles.bookingsAsideCopy}>
              {isFiltered
                ? "match the current search and filters. Clear them to see the whole queue."
                : "in this company's booking queue. Pending requests need a decision first."}
            </p>
          </div>
          <button
            className={styles.bookingsAsideCta}
            type="button"
            onClick={isFiltered ? clearFilters : reviewPending}
          >
            {isFiltered ? (
              <>
                <X size={15} /> Clear filters
              </>
            ) : (
              <>
                <ArrowRight size={15} /> Review pending
              </>
            )}
          </button>
        </aside>
      </section>

      <section
        className={styles.bookingsControls}
        aria-label="Search and filter bookings"
      >
        <div className={styles.bookingsControlsTop}>
          <div className={styles.bookingsSearch}>
            <span className={styles.bookingsSearchIcon} aria-hidden="true">
              <Search size={16} />
            </span>
            <label className={styles.bookingsSrOnly} htmlFor="booking-search">
              Search bookings
            </label>
            <input
              id="booking-search"
              className={styles.bookingsSearchInput}
              type="search"
              placeholder="Search reference, guest, contact or tour…"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              autoComplete="off"
              maxLength={200}
            />
            {searchInput ? (
              <button
                className={styles.bookingsSearchClear}
                type="button"
                onClick={() => applySearch("")}
                aria-label="Clear booking search"
              >
                <X size={15} />
              </button>
            ) : null}
          </div>
          <div className={styles.bookingsControlsMeta}>
            {loading && bookings.length > 0 ? (
              <span className={styles.bookingsBusy}>
                <span className={styles.bookingsBusyDot} aria-hidden="true" />
                Updating
              </span>
            ) : null}
            <p className={styles.bookingsCount} role="status" aria-live="polite">
              <strong>{total}</strong> booking{total === 1 ? "" : "s"}
              {isFiltered ? " match" : ""}
            </p>
          </div>
        </div>
        <div className={styles.bookingsFilters}>
          <div className={styles.bookingsChipGroup}>
            <span className={styles.bookingsChipGroupLabel}>Status</span>
            <div
              className={styles.bookingsChips}
              role="group"
              aria-label="Booking status"
            >
              {STATUS_FILTERS.map((filter) => {
                const active = status === filter.value;
                return (
                  <button
                    key={filter.value || "all"}
                    className={`${styles.bookingsChip} ${
                      active ? styles.bookingsChipActive : ""
                    }`}
                    type="button"
                    aria-pressed={active}
                    onClick={() => changeStatus(filter.value)}
                  >
                    {active ? (
                      <span
                        className={styles.bookingsChipDot}
                        aria-hidden="true"
                      />
                    ) : null}
                    {filter.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div className={styles.bookingsFields}>
            <label className={styles.bookingsField}>
              <span className={styles.bookingsFieldLabel}>Tour</span>
              <select
                className={styles.bookingsSelect}
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
            <label className={styles.bookingsField}>
              <span className={styles.bookingsFieldLabel}>Travel date</span>
              <input
                className={styles.bookingsDate}
                type="date"
                value={travelDate}
                onChange={(event) => {
                  setTravelDate(event.target.value);
                  setPage(1);
                }}
              />
            </label>
            {isFiltered ? (
              <button
                className={styles.bookingsReset}
                type="button"
                onClick={clearFilters}
              >
                <Filter size={13} /> Clear filters
              </button>
            ) : null}
          </div>
        </div>
      </section>

      {error ? (
        <div
          className={`${styles.bookingsState} ${styles.bookingsStateDanger}`}
          role="alert"
        >
          <span className={styles.bookingsStateIcon} aria-hidden="true">
            <AlertCircle size={22} />
          </span>
          <h2 className={styles.bookingsStateTitle}>Bookings unavailable</h2>
          <p className={styles.bookingsStateCopy}>{error}</p>
          <div className={styles.bookingsStateActions}>
            <button
              className="btn btn-outline btn-sm"
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        </div>
      ) : loading && bookings.length === 0 ? (
        <div className={styles.bookingsGridWrap} role="status">
          <span className={styles.bookingsSrOnly}>
            Loading company bookings…
          </span>
          <ul className={styles.bookingsGrid} aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <li className={styles.bookingsSkeleton} key={index}>
                <div className={styles.bookingsSkeletonHead} />
                <div className={styles.bookingsSkeletonBody}>
                  <div className={styles.bookingsSkeletonGuest}>
                    <div className={styles.bookingsSkeletonAvatar} />
                    <div className={styles.bookingsSkeletonStack}>
                      <div
                        className={`${styles.bookingsSkeletonLine} ${styles.bookingsSkeletonTitle}`}
                      />
                      <div
                        className={`${styles.bookingsSkeletonLine} ${styles.bookingsSkeletonLineShort}`}
                      />
                    </div>
                  </div>
                  <div className={styles.bookingsSkeletonFacts}>
                    <div className={styles.bookingsSkeletonFact} />
                    <div className={styles.bookingsSkeletonFact} />
                  </div>
                  <div
                    className={`${styles.bookingsSkeletonLine} ${styles.bookingsSkeletonLineMedium}`}
                  />
                  <div
                    className={`${styles.bookingsSkeletonLine} ${styles.bookingsSkeletonLineShort}`}
                  />
                  <div className={styles.bookingsSkeletonFoot}>
                    <div className={styles.bookingsSkeletonPrice} />
                    <div className={styles.bookingsSkeletonMeta} />
                  </div>
                </div>
                <div className={styles.bookingsSkeletonActions}>
                  <div className={styles.bookingsSkeletonButton} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : bookings.length === 0 ? (
        <div className={styles.bookingsState}>
          <span className={styles.bookingsStateIcon} aria-hidden="true">
            {isFiltered ? (
              <Search size={22} />
            ) : (
              <ClipboardList size={22} />
            )}
          </span>
          <h2 className={styles.bookingsStateTitle}>{emptyTitle}</h2>
          <p className={styles.bookingsStateCopy}>{emptyCopy}</p>
          <div className={styles.bookingsStateActions}>
            {isFiltered ? (
              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            ) : (
              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={() => setReloadKey((value) => value + 1)}
              >
                Refresh queue
              </button>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className={styles.bookingsGridWrap} aria-busy={loading}>
            <ul
              className={`${styles.bookingsGrid} ${
                loading ? styles.bookingsGridBusy : ""
              }`}
            >
              {bookings.map((booking) => {
                const reference = bookingReference(booking);
                const price = formatPrice(booking.total_price);
                const tourName = booking.tour_title?.trim() || "Tour unavailable";
                const destination = booking.tour_destination?.trim() || "";
                const email = booking.email?.trim() || "";
                const phone = booking.phone?.trim() || "";

                return (
                  <li className={styles.bookingsCard} key={booking.id}>
                    <div className={styles.bookingsCardHead}>
                      <div className={styles.bookingsRef}>
                        <span className={styles.bookingsRefLabel}>
                          Reference
                        </span>
                        <Link
                          className={styles.bookingsRefValue}
                          href={`/company/bookings/${booking.id}/`}
                          title={reference}
                        >
                          {reference}
                        </Link>
                      </div>
                      <span
                        className={`${styles.bookingsStatus} ${statusTone(
                          booking.status,
                        )}`}
                      >
                        <span
                          className={styles.bookingsStatusDot}
                          aria-hidden="true"
                        />
                        {statusLabel(booking.status)}
                      </span>
                    </div>

                    <div className={styles.bookingsBody}>
                      <div className={styles.bookingsGuest}>
                        <span className={styles.bookingsAvatar} aria-hidden="true">
                          {initials(booking.full_name)}
                        </span>
                        <div className={styles.bookingsGuestText}>
                          <h3 className={styles.bookingsGuestName}>
                            <Link
                              href={`/company/bookings/${booking.id}/`}
                              title={booking.full_name}
                            >
                              {booking.full_name}
                            </Link>
                          </h3>
                          <p
                            className={styles.bookingsTour}
                            title={`${tourName}${
                              destination ? ` · ${destination}` : ""
                            }`}
                          >
                            <MapPin size={13} aria-hidden="true" />
                            <span className={styles.bookingsTourText}>
                              {tourName}
                              {destination ? ` · ${destination}` : ""}
                            </span>
                          </p>
                        </div>
                      </div>

                      <dl className={styles.bookingsFacts}>
                        <div className={styles.bookingsFact}>
                          <dt className={styles.bookingsFactLabel}>
                            Travel date
                          </dt>
                          <dd className={styles.bookingsFactValue}>
                            <CalendarDays size={12} aria-hidden="true" />
                            {formatDate(booking.travel_date)}
                          </dd>
                        </div>
                        <div className={styles.bookingsFact}>
                          <dt className={styles.bookingsFactLabel}>
                            Travelers
                          </dt>
                          <dd className={styles.bookingsFactValue}>
                            <Users size={12} aria-hidden="true" />
                            {booking.travelers} traveler
                            {booking.travelers === 1 ? "" : "s"}
                          </dd>
                        </div>
                      </dl>

                      {email || phone ? (
                        <div className={styles.bookingsContact}>
                          {email ? (
                            <a
                              className={styles.bookingsContactItem}
                              href={`mailto:${email}`}
                              title={email}
                            >
                              <Mail size={13} aria-hidden="true" />
                              <span>{email}</span>
                            </a>
                          ) : null}
                          {phone ? (
                            <a
                              className={styles.bookingsContactItem}
                              href={`tel:${phone}`}
                              title={phone}
                            >
                              <Phone size={13} aria-hidden="true" />
                              <span>{phone}</span>
                            </a>
                          ) : null}
                        </div>
                      ) : (
                        <p className={styles.bookingsContactEmpty}>
                          No contact details on file
                        </p>
                      )}

                      <div className={styles.bookingsFoot}>
                        <div className={styles.bookingsPrice}>
                          <span className={styles.bookingsPriceValue}>
                            {price ?? "Not quoted"}
                          </span>
                          <span className={styles.bookingsPriceHint}>
                            {price ? "Booking total" : "No total recorded"}
                          </span>
                        </div>
                        <div className={styles.bookingsFootMeta}>
                          <span>{bookedLabel(booking.created_at)}</span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.bookingsCardActions}>
                      <Link
                        className="btn btn-primary btn-sm"
                        href={`/company/bookings/${booking.id}/`}
                      >
                        Open booking <ArrowRight size={15} />
                      </Link>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <nav className={styles.bookingsPagination} aria-label="Booking pages">
            <p className={styles.bookingsRange}>
              Showing <strong>{rangeStart}</strong>–
              <strong>{rangeEnd}</strong> of <strong>{total}</strong> booking
              {total === 1 ? "" : "s"}
            </p>
            <div className={styles.bookingsPageControls}>
              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1 || loading}
                aria-label="Previous page"
              >
                <ChevronLeft size={15} /> Previous
              </button>
              <span className={styles.bookingsPageStatus}>
                Page {page} of {pages}
              </span>
              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={() => setPage((value) => Math.min(pages, value + 1))}
                disabled={page >= pages || loading}
                aria-label="Next page"
              >
                Next <ChevronRight size={15} />
              </button>
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
