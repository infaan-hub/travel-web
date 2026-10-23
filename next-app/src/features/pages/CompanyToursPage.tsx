"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { companyAPI } from "@/lib/api/client";
import {
  ChevronLeft,
  ChevronRight,
  Globe,
  Plus,
  Trash2,
} from "@/components/icons";
import { useToast } from "@/components/ToastProvider";
import styles from "@/features/pages/company-operations.module.css";

const PAGE_SIZE = 12;

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
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_REVIEW: "Pending review",
  PUBLISHED: "Published",
  REJECTED: "Rejected",
  ARCHIVED: "Archived",
};

function statusClass(status: string) {
  if (status === "PUBLISHED") return styles.badgePublished;
  if (status === "PENDING_REVIEW") return styles.badgeReview;
  if (status === "REJECTED" || status === "ARCHIVED") return styles.badgeArchived;
  return styles.badgeDraft;
}

function formatDate(value: string | null) {
  if (!value) return "Not set";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function CompanyToursPage() {
  const toast = useToast();
  const [tours, setTours] = useState<CompanyTourRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

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
  }, [page, status, reloadKey]);

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

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
      setReloadKey((value) => value + 1);
    } catch {
      toast.error("The tour could not be archived.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={`page ${styles.pageStack}`}>
      <div className={styles.pageHead}>
        <div className={styles.pageTitleWrap}>
          <p className={styles.eyebrow}>Company workspace</p>
          <h1 className={styles.pageTitle}>Tours</h1>
          <p className={styles.pageLead}>
            Create and maintain this company&apos;s tours. Publication is a
            separate control from availability, so a tour can be temporarily
            unavailable while remaining published.
          </p>
        </div>
        <div className={styles.pageActions}>
          <Link className="btn btn-primary" href="/company/tours/create/">
            <Plus size={16} /> Create tour
          </Link>
        </div>
      </div>

      <div className={styles.toolbar}>
        <label className={styles.filterField}>
          <span className={styles.filterLabel}>Publication</span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
          >
            <option value="">All states</option>
            <option value="PUBLISHED">Published</option>
            <option value="DRAFT">Draft</option>
            <option value="PENDING_REVIEW">Pending review</option>
            <option value="REJECTED">Rejected</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </label>
        <div className={styles.toolbarEnd}>
          <span className={styles.pageInfo}>
            {total} tour{total === 1 ? "" : "s"}
          </span>
        </div>
      </div>

      {error ? (
        <div className={styles.empty} role="alert">
          <span className={styles.emptyIcon}>
            <Globe size={20} />
          </span>
          <h2 className={styles.emptyTitle}>Tours unavailable</h2>
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
          Loading company tours...
        </div>
      ) : tours.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcon}>
            <Globe size={20} />
          </span>
          <h2 className={styles.emptyTitle}>No tours found</h2>
          <p className={styles.emptyCopy}>
            {status
              ? "No tours match the current filters. Try a different publication state."
              : "Create the first tour for this company. It will stay in draft until you publish it."}
          </p>
          {!status ? (
            <Link className="btn btn-primary btn-sm" href="/company/tours/create/">
              <Plus size={15} /> Create tour
            </Link>
          ) : null}
        </div>
      ) : (
        <>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">Tour</th>
                  <th scope="col">Publication</th>
                  <th scope="col">Availability</th>
                  <th scope="col">Bookings</th>
                  <th scope="col">Updated</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tours.map((tour) => (
                  <tr key={tour.id}>
                    <td>
                      <Link
                        className={styles.cellTitle}
                        href={`/company/tours/${tour.id}/`}
                      >
                        {tour.title}
                      </Link>
                      <span className={styles.cellSub}>
                        {tour.destination} · {tour.duration}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${statusClass(
                          tour.publication_status,
                        )}`}
                      >
                        {STATUS_LABELS[tour.publication_status] ??
                          tour.publication_status}
                      </span>
                    </td>
                    <td>
                      <span
                        className={`${styles.badge} ${
                          tour.available
                            ? styles.badgeAvailable
                            : styles.badgeNeutral
                        }`}
                      >
                        {tour.available ? "Available" : "Not bookable"}
                      </span>
                    </td>
                    <td>{tour.bookings_count ?? 0}</td>
                    <td className={styles.cellNowrap}>
                      {formatDate(tour.updated_at)}
                    </td>
                    <td>
                      <div className={styles.tableActions}>
                        <Link
                          className="btn btn-outline btn-sm"
                          href={`/company/tours/${tour.id}/`}
                        >
                          Edit
                        </Link>
                        <button
                          className="btn btn-ghost btn-sm"
                          type="button"
                          onClick={() => archive(tour)}
                          disabled={busyId === tour.id}
                          aria-label={`Archive ${tour.title}`}
                        >
                          <Trash2 size={14} />
                          {busyId === tour.id ? "Archiving..." : "Archive"}
                        </button>
                      </div>
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
