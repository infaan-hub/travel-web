"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { companyAPI } from "@/lib/api/client";
import {
  AlertCircle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Clock,
  Compass,
  ExternalLink,
  Globe,
  Loader,
  MapPin,
  Plus,
  Search,
  Star,
  Trash2,
  X,
} from "@/components/icons";
import { useToast } from "@/components/ToastProvider";
import styles from "@/features/pages/company-tours.module.css";

const PAGE_SIZE = 12;
const SEARCH_DEBOUNCE = 300;

type CompanyTourRow = {
  id: number;
  title: string;
  destination: string;
  duration: string;
  price: string | null;
  publication_status: string;
  available: boolean;
  bookings_count: number | null;
  updated_at: string | null;
  image_url: string | null;
  short_description: string | null;
  category: string | null;
  average_rating: number | null;
  review_count: number | null;
  max_travelers: number | null;
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

const STATUS_FILTERS = [
  { value: "", label: "All states" },
  { value: "PUBLISHED", label: "Published" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING_REVIEW", label: "Pending review" },
  { value: "REJECTED", label: "Rejected" },
  { value: "ARCHIVED", label: "Archived" },
] as const;

function statusTone(status: string) {
  if (status === "PUBLISHED") return styles.toursStatusOk;
  if (status === "PENDING_REVIEW") return styles.toursStatusInfo;
  if (status === "DRAFT") return styles.toursStatusWarn;
  if (status === "REJECTED") return styles.toursStatusDanger;
  return styles.toursStatusNeutral;
}

function formatPrice(value: string | null) {
  if (!value) return null;
  const amount = Number(value);
  if (!Number.isFinite(amount)) return null;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  }).format(amount);
}

function formatUpdated(value: string | null) {
  if (!value) return "Not updated yet";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not updated yet";
  return `Updated ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })}`;
}

function statusLabel(status: string) {
  return STATUS_LABELS[status] ?? status.replace(/_/g, " ");
}

export default function CompanyToursPage() {
  const toast = useToast();
  const [tours, setTours] = useState<CompanyTourRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const committedSearch = useRef("");

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
        const response = await companyAPI.tours({
          page,
          page_size: PAGE_SIZE,
          ...(status ? { publication_status: status } : {}),
          ...(search ? { search } : {}),
        });
        if (cancelled) return;
        const payload = response.data;
        const rows: CompanyTourRow[] = Array.isArray(payload)
          ? payload
          : payload.results ?? [];
        const countHeader = Number(response.headers["x-total-count"]);
        setTours(rows);
        setTotal(
          Number.isFinite(countHeader) && countHeader >= 0
            ? countHeader
            : Array.isArray(payload)
              ? rows.length
              : Number(payload.count ?? rows.length),
        );
      } catch {
        if (cancelled) return;
        setTours([]);
        setTotal(0);
        setError("Company tours could not be loaded. Please try again.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [page, status, search, reloadKey]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const isFiltered = Boolean(search || status);
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(total, (page - 1) * PAGE_SIZE + tours.length);
  const visibleBookings = tours.reduce(
    (sum, tour) => sum + (tour.bookings_count ?? 0),
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
  };

  const changeStatus = (value: string) => {
    setStatus(value);
    setPage(1);
  };

  const archive = async (tour: CompanyTourRow) => {
    if (
      !window.confirm(
        `Archive "${tour.title}"? This removes it from the public catalogue but keeps its booking history.`,
      )
    ) {
      return;
    }
    setBusyId(tour.id);
    try {
      await companyAPI.deleteTour(tour.id);
      toast.success("Tour archived.");
      if (tours.length === 1 && page > 1) {
        setPage(page - 1);
      } else {
        setReloadKey((value) => value + 1);
      }
    } catch {
      toast.error("The tour could not be archived.");
    } finally {
      setBusyId(null);
    }
  };

  const emptyTitle = isFiltered
    ? "No matching experiences"
    : "No experiences yet";
  const emptyCopy = search
    ? `No tours match “${search}”. Try a different title, destination or description${
        status ? " and publication state" : ""
      }.`
    : status
      ? `No tours are currently ${statusLabel(status).toLowerCase()}. Choose another publication state.`
      : "Create the first tour for this company. It will stay in draft until you publish it.";

  return (
    <div id="tours-workspace" className={styles.toursRoot}>
      <header className={styles.toursMasthead}>
        <div className={styles.toursMastheadText}>
          <nav className={styles.toursBreadcrumb} aria-label="Breadcrumb">
            <Link href="/company/dashboard/">Company workspace</Link>
            <span className={styles.toursBreadcrumbSep} aria-hidden="true">
              /
            </span>
            <span className={styles.toursBreadcrumbCurrent}>Tours</span>
          </nav>
          <p className={styles.toursEyebrow}>Company workspace</p>
          <h1 className={styles.toursTitle}>Experiences</h1>
          <p className={styles.toursLead}>
            Create and maintain this company&apos;s tours. Publication is a
            separate control from availability, so a tour can be temporarily
            unavailable while remaining published.
          </p>
        </div>
        <div className={styles.toursActions}>
          <Link className="btn btn-primary" href="/company/tours/create/">
            <Plus size={16} /> Create tour
          </Link>
        </div>
      </header>

      <section className={styles.toursHero} aria-label="Catalogue overview">
        <div className={styles.toursHeroMain}>
          <div className={styles.toursHeroHead}>
            <span className={styles.toursHeroIcon} aria-hidden="true">
              <Compass size={23} />
            </span>
            <div>
              <h2 className={styles.toursHeroTitle}>Catalogue overview</h2>
              <p className={styles.toursHeroCopy}>
                Every tour below belongs to your active company. Search the
                catalogue, narrow it by publication state, then open a card to
                edit details, pricing and availability.
              </p>
            </div>
          </div>
          <ul className={styles.toursStatRow}>
            <li className={styles.toursStat}>
              <span className={styles.toursStatLabel}>Results</span>
              <span className={styles.toursStatValue}>{total}</span>
              <span className={styles.toursStatHint}>
                {isFiltered ? "After search & filters" : "Whole catalogue"}
              </span>
            </li>
            <li className={styles.toursStat}>
              <span className={styles.toursStatLabel}>Page</span>
              <span className={styles.toursStatValue}>
                {page} / {pages}
              </span>
              <span className={styles.toursStatHint}>
                {PAGE_SIZE} tours per page
              </span>
            </li>
            <li className={styles.toursStat}>
              <span className={styles.toursStatLabel}>Visible bookings</span>
              <span className={styles.toursStatValue}>{visibleBookings}</span>
              <span className={styles.toursStatHint}>Across these cards</span>
            </li>
          </ul>
        </div>
        <aside className={styles.toursAside}>
          <div className={styles.toursAsideMain}>
            <p className={styles.toursAsideLabel}>Catalogue size</p>
            <p className={styles.toursAsideValue}>
              {total} <span>tour{total === 1 ? "" : "s"}</span>
            </p>
            <p className={styles.toursAsideCopy}>
              {isFiltered
                ? "match the current search and publication filter."
                : "in this company's catalogue. New tours stay in draft until you publish them."}
            </p>
          </div>
          <Link className={styles.toursAsideCta} href="/company/tours/create/">
            <Plus size={15} /> Create tour
          </Link>
        </aside>
      </section>

      <section
        className={styles.toursControls}
        aria-label="Search and filter tours"
      >
        <div className={styles.toursControlsTop}>
          <div className={styles.toursSearch}>
            <span className={styles.toursSearchIcon} aria-hidden="true">
              <Search size={16} />
            </span>
            <label className={styles.toursSrOnly} htmlFor="tour-search">
              Search tours
            </label>
            <input
              id="tour-search"
              className={styles.toursSearchInput}
              type="search"
              placeholder="Search by title, destination or description…"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              autoComplete="off"
              maxLength={200}
            />
            {searchInput ? (
              <button
                className={styles.toursSearchClear}
                type="button"
                onClick={() => applySearch("")}
                aria-label="Clear tour search"
              >
                <X size={15} />
              </button>
            ) : null}
          </div>
          <div className={styles.toursControlsMeta}>
            {loading && tours.length > 0 ? (
              <span className={styles.toursBusy}>
                <span className={styles.toursBusyDot} aria-hidden="true" />
                Updating
              </span>
            ) : null}
            <p className={styles.toursCount} role="status" aria-live="polite">
              <strong>{total}</strong> tour{total === 1 ? "" : "s"}
              {isFiltered ? " match" : ""}
            </p>
          </div>
        </div>
        <div className={styles.toursFilters}>
          <div
            className={styles.toursFilterScroll}
            role="group"
            aria-label="Publication status"
          >
            {STATUS_FILTERS.map((filter) => {
              const active = status === filter.value;
              return (
                <button
                  key={filter.value || "all"}
                  className={`${styles.toursFilter} ${
                    active ? styles.toursFilterActive : ""
                  }`}
                  type="button"
                  aria-pressed={active}
                  onClick={() => changeStatus(filter.value)}
                >
                  {active ? (
                    <span
                      className={styles.toursFilterDot}
                      aria-hidden="true"
                    />
                  ) : null}
                  {filter.label}
                </button>
              );
            })}
          </div>
          {isFiltered ? (
            <button
              className={styles.toursReset}
              type="button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </section>

      {error ? (
        <div
          className={`${styles.toursState} ${styles.toursStateDanger}`}
          role="alert"
        >
          <span className={styles.toursStateIcon} aria-hidden="true">
            <AlertCircle size={22} />
          </span>
          <h2 className={styles.toursStateTitle}>Experiences unavailable</h2>
          <p className={styles.toursStateCopy}>{error}</p>
          <div className={styles.toursStateActions}>
            <button
              className="btn btn-outline btn-sm"
              type="button"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        </div>
      ) : loading && tours.length === 0 ? (
        <div className={styles.toursGridWrap} role="status">
          <span className={styles.toursSrOnly}>
            Loading company experiences…
          </span>
          <ul className={styles.toursGrid} aria-hidden="true">
            {Array.from({ length: 6 }, (_, index) => (
              <li className={styles.toursSkeleton} key={index}>
                <div className={styles.toursSkeletonMedia} />
                <div className={styles.toursSkeletonBody}>
                  <div
                    className={`${styles.toursSkeletonLine} ${styles.toursSkeletonTitle}`}
                  />
                  <div
                    className={`${styles.toursSkeletonLine} ${styles.toursSkeletonLineMedium}`}
                  />
                  <div
                    className={`${styles.toursSkeletonLine} ${styles.toursSkeletonLineShort}`}
                  />
                  <div className={styles.toursSkeletonFooter}>
                    <div className={styles.toursSkeletonPrice} />
                    <div className={styles.toursSkeletonMeta} />
                  </div>
                </div>
                <div className={styles.toursSkeletonActions}>
                  <div className={styles.toursSkeletonButton} />
                  <div
                    className={`${styles.toursSkeletonButton} ${styles.toursSkeletonButtonIcon}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : tours.length === 0 ? (
        <div className={styles.toursState}>
          <span className={styles.toursStateIcon} aria-hidden="true">
            {isFiltered ? <Search size={22} /> : <Globe size={22} />}
          </span>
          <h2 className={styles.toursStateTitle}>{emptyTitle}</h2>
          <p className={styles.toursStateCopy}>{emptyCopy}</p>
          <div className={styles.toursStateActions}>
            {isFiltered ? (
              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            ) : (
              <Link
                className="btn btn-primary btn-sm"
                href="/company/tours/create/"
              >
                <Plus size={15} /> Create tour
              </Link>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className={styles.toursGridWrap} aria-busy={loading}>
            <ul
              className={`${styles.toursGrid} ${
                loading ? styles.toursGridBusy : ""
              }`}
            >
              {tours.map((tour) => {
                const price = formatPrice(tour.price);
                const rating =
                  tour.average_rating !== null &&
                  Number.isFinite(Number(tour.average_rating))
                    ? Number(tour.average_rating).toFixed(1)
                    : null;
                const reviews = tour.review_count ?? 0;
                const busy = busyId === tour.id;

                return (
                  <li className={styles.toursCard} key={tour.id}>
                    <div className={styles.toursMedia}>
                      {tour.image_url ? (
                        <Image
                          className={styles.toursMediaImg}
                          src={tour.image_url}
                          alt=""
                          fill
                          sizes="(max-width: 640px) 100vw, (max-width: 980px) 50vw, 33vw"
                        />
                      ) : (
                        <span
                          className={styles.toursMediaFallback}
                          aria-hidden="true"
                        >
                          <Compass size={34} />
                        </span>
                      )}
                      <span
                        className={styles.toursMediaShade}
                        aria-hidden="true"
                      />
                      <span className={styles.toursCategory}>
                        {tour.category?.trim() || "Experience"}
                      </span>
                      <span
                        className={`${styles.toursStatus} ${statusTone(
                          tour.publication_status,
                        )}`}
                      >
                        <span
                          className={styles.toursStatusDot}
                          aria-hidden="true"
                        />
                        {statusLabel(tour.publication_status)}
                      </span>
                    </div>

                    <div className={styles.toursBody}>
                      <h3 className={styles.toursCardTitle}>
                        <Link href={`/company/tours/${tour.id}/`}>
                          {tour.title}
                        </Link>
                      </h3>
                      <p className={styles.toursMeta}>
                        <span className={styles.toursMetaItem}>
                          <MapPin size={13} aria-hidden="true" />
                          <span>{tour.destination || "No destination"}</span>
                        </span>
                        <span className={styles.toursMetaItem}>
                          <Clock size={13} aria-hidden="true" />
                          <span>{tour.duration || "Flexible duration"}</span>
                        </span>
                      </p>
                      {tour.short_description?.trim() ? (
                        <p className={styles.toursCopy}>
                          {tour.short_description}
                        </p>
                      ) : null}
                      <div className={styles.toursSignals}>
                        {rating !== null ? (
                          <span className={styles.toursRating}>
                            <Star size={13} aria-hidden="true" />
                            {rating}
                            <span className={styles.toursRatingMuted}>
                              ({reviews})
                            </span>
                          </span>
                        ) : (
                          <span
                            className={`${styles.toursRating} ${styles.toursRatingMuted}`}
                          >
                            No reviews yet
                          </span>
                        )}
                        <span
                          className={`${styles.toursAvailability} ${
                            tour.available
                              ? styles.toursAvailabilityOn
                              : styles.toursAvailabilityOff
                          }`}
                        >
                          {tour.available ? (
                            <CheckCircle size={12} aria-hidden="true" />
                          ) : null}
                          {tour.available ? "Available" : "Not bookable"}
                        </span>
                      </div>
                      <div className={styles.toursFoot}>
                        <div className={styles.toursPrice}>
                          <span className={styles.toursPriceValue}>
                            {price ?? "Price on request"}
                          </span>
                          <span className={styles.toursPriceHint}>
                            {price ? "per person" : "No price set"}
                          </span>
                        </div>
                        <div className={styles.toursFootMeta}>
                          <span className={styles.toursBookings}>
                            <ClipboardList size={12} aria-hidden="true" />
                            {tour.bookings_count ?? 0} booking
                            {(tour.bookings_count ?? 0) === 1 ? "" : "s"}
                          </span>
                          <span className={styles.toursUpdated}>
                            {formatUpdated(tour.updated_at)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className={styles.toursCardActions}>
                      <Link
                        className="btn btn-primary btn-sm"
                        href={`/company/tours/${tour.id}/`}
                      >
                        Edit tour
                      </Link>
                      {tour.publication_status === "PUBLISHED" ? (
                        <a
                          className={styles.toursIconAction}
                          href={`/tour/${tour.id}/`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label={`View the public page for ${tour.title}`}
                          title="View public page"
                        >
                          <ExternalLink size={15} />
                        </a>
                      ) : null}
                      <button
                        className={styles.toursArchive}
                        type="button"
                        onClick={() => archive(tour)}
                        disabled={busy}
                        aria-label={`Archive ${tour.title}`}
                        title="Archive tour"
                      >
                        {busy ? (
                          <span className={styles.toursSpin}>
                            <Loader size={15} />
                          </span>
                        ) : (
                          <Trash2 size={15} />
                        )}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          <nav className={styles.toursPagination} aria-label="Tour pages">
            <p className={styles.toursRange}>
              Showing <strong>{rangeStart}</strong>–
              <strong>{rangeEnd}</strong> of <strong>{total}</strong> tour
              {total === 1 ? "" : "s"}
            </p>
            <div className={styles.toursPageControls}>
              <button
                className="btn btn-outline btn-sm"
                type="button"
                onClick={() => setPage((value) => Math.max(1, value - 1))}
                disabled={page <= 1 || loading}
                aria-label="Previous page"
              >
                <ChevronLeft size={15} /> Previous
              </button>
              <span className={styles.toursPageStatus}>
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
