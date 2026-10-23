"use client";

import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { companiesAPI } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Eye,
  MapPin,
  Plus,
} from "@/components/icons";
import { getImageUrl } from "@/lib/utils/image-url";
import { useToast } from "@/components/ToastProvider";
import type { Company, CompanyBusinessType, CompanyStatus } from "@/features/pages/types";
import styles from "@/features/pages/admin-companies.module.css";

const PAGE_SIZE = 10;

const STATUS_LABELS: Record<CompanyStatus, string> = {
  PENDING: "Pending",
  ACTIVE: "Active",
  SUSPENDED: "Suspended",
  ARCHIVED: "Archived",
};

const TYPE_LABELS: Record<CompanyBusinessType, string> = {
  TOUR_OPERATOR: "Tour operator",
  SAFARI_OPERATOR: "Safari operator",
  EXCURSION_PROVIDER: "Excursion provider",
  OTHER: "Other",
};

const STATUS_CLASSES: Record<CompanyStatus, string> = {
  PENDING: styles.statusPending,
  ACTIVE: styles.statusActive,
  SUSPENDED: styles.statusSuspended,
  ARCHIVED: styles.statusArchived,
};

function locationLabel(company: Company) {
  return [company.locality, company.region, company.country].filter(Boolean).join(", ");
}

export default function AdminCompaniesPage() {
  const toast = useToast();
  const router = useRouter();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<CompanyStatus | "">("");
  const [businessType, setBusinessType] = useState<CompanyBusinessType | "">("");
  const [region, setRegion] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) {
      router.push("/admin/login");
    }
  }, [authLoading, isAuthenticated, isAdmin, router]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !isAdmin) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await companiesAPI.list({
          page,
          page_size: PAGE_SIZE,
          ...(status ? { status } : {}),
          ...(businessType ? { business_type: businessType } : {}),
          ...(region.trim() ? { region: region.trim() } : {}),
        });
        if (cancelled) return;
        const payload = response.data;
        const rows: Company[] = Array.isArray(payload) ? payload : payload.results ?? [];
        const countHeader = Number(response.headers["x-total-count"]);
        setCompanies(rows);
        setTotal(
          Number.isFinite(countHeader) && countHeader >= 0
            ? countHeader
            : Array.isArray(payload)
              ? rows.length
              : Number(payload.count ?? rows.length),
        );
      } catch {
        if (cancelled) return;
        setCompanies([]);
        setTotal(0);
        setError("Companies could not be loaded. Please try again.");
        toast.error("Failed to load companies.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, region ? 300 : 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [
    authLoading,
    isAuthenticated,
    isAdmin,
    page,
    status,
    businessType,
    region,
    reloadKey,
    toast,
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(status || businessType || region.trim());
  const rangeStart = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const rangeEnd = Math.min(page * PAGE_SIZE, total);

  const resetFilters = () => {
    setStatus("");
    setBusinessType("");
    setRegion("");
    setPage(1);
  };

  const cardMetrics = useMemo(
    () => ({
      active: companies.filter((company) => company.status === "ACTIVE").length,
      public: companies.filter((company) => company.is_public).length,
    }),
    [companies],
  );

  if (authLoading) {
    return (
      <div className="page">
        <div className="loading">Checking access…</div>
      </div>
    );
  }

  if (!isAuthenticated || !isAdmin) return null;

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1>
          <Building2 size={20} /> Companies
        </h1>
        <p>
          {total} {total === 1 ? "company" : "companies"}
          {cardMetrics.active > 0 && ` · ${cardMetrics.active} active on this page`}
          {cardMetrics.public > 0 && ` · ${cardMetrics.public} public on this page`}
        </p>
      </div>

      <div className={`admin-toolbar ${styles.companyToolbar}`}>
        <div className="filter-select-group">
          <label className="sr-only" htmlFor="company-status-filter">
            Filter by status
          </label>
          <select
            id="company-status-filter"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as CompanyStatus | "");
              setPage(1);
            }}
          >
            <option value="">All statuses</option>
            <option value="PENDING">Pending</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
        <div className="filter-select-group">
          <label className="sr-only" htmlFor="company-type-filter">
            Filter by business type
          </label>
          <select
            id="company-type-filter"
            value={businessType}
            onChange={(event) => {
              setBusinessType(event.target.value as CompanyBusinessType | "");
              setPage(1);
            }}
          >
            <option value="">All business types</option>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="search-input-group">
          <MapPin size={16} />
          <input
            type="text"
            placeholder="Filter by region"
            value={region}
            onChange={(event) => {
              setRegion(event.target.value);
              setPage(1);
            }}
            aria-label="Filter companies by region"
          />
        </div>
        <Link href="/admin/companies/create" className="btn btn-primary">
          <Plus size={16} /> Add company
        </Link>
      </div>

      {hasFilters && (
        <div className={styles.filterSummary}>
          <span>
            Showing {companies.length} result{companies.length === 1 ? "" : "s"} for
            the current filters.
          </span>
          <button type="button" className="btn btn-sm btn-outline" onClick={resetFilters}>
            Clear filters
          </button>
        </div>
      )}

      <div className="admin-content">
        {loading ? (
          <div className="loading">Loading companies…</div>
        ) : error ? (
          <div className="empty-state">
            <h3>Unable to load companies</h3>
            <p>{error}</p>
            <button
              type="button"
              className="btn btn-outline"
              onClick={() => setReloadKey((value) => value + 1)}
            >
              Try again
            </button>
          </div>
        ) : companies.length === 0 ? (
          <div className="empty-state">
            <Building2 size={36} />
            <h3>{hasFilters ? "No companies match" : "No companies yet"}</h3>
            <p>
              {hasFilters
                ? "Try different filters or clear them."
                : "Create the first company profile. It starts pending and private."}
            </p>
            {hasFilters ? (
              <button type="button" className="btn btn-outline" onClick={resetFilters}>
                Clear filters
              </button>
            ) : (
              <Link href="/admin/companies/create" className="btn btn-primary">
                <Plus size={16} /> Add company
              </Link>
            )}
          </div>
        ) : (
          <>
            <div className="admin-attractions-table">
              <div className="table-responsive">
                <table className={styles.companyTable}>
                  <thead>
                    <tr>
                      <th scope="col">Company</th>
                      <th scope="col">Type</th>
                      <th scope="col">Location</th>
                      <th scope="col">Status</th>
                      <th scope="col">Team</th>
                      <th scope="col">Tours</th>
                      <th scope="col">Bookings</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((company) => (
                      <tr key={company.id}>
                        <td>
                          <div className={styles.companyCell}>
                            {company.logo_image_url ? (
                              <Image
                                src={getImageUrl(company.logo_image_url)}
                                alt=""
                                width={52}
                                height={52}
                                className={styles.companyLogo}
                              />
                            ) : (
                              <span className={styles.companyLogoFallback} aria-hidden="true">
                                {company.name.charAt(0).toUpperCase()}
                              </span>
                            )}
                            <div className={styles.companyIdentity}>
                              <Link
                                href={`/admin/companies/${company.id}`}
                                className={styles.companyName}
                              >
                                {company.name}
                              </Link>
                              <span className={styles.companySlug}>/{company.slug}</span>
                              {company.is_public && (
                                <span className={styles.publicBadge}>Public</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td data-label="Type">
                          {TYPE_LABELS[company.business_type] ?? company.business_type}
                        </td>
                        <td data-label="Location">{locationLabel(company) || "—"}</td>
                        <td data-label="Status">
                          <span
                            className={`role-badge ${STATUS_CLASSES[company.status] ?? ""}`}
                          >
                            {STATUS_LABELS[company.status] ?? company.status}
                          </span>
                        </td>
                        <td data-label="Team">{company.members_count}</td>
                        <td data-label="Tours">{company.tours_count}</td>
                        <td data-label="Bookings">{company.bookings_count}</td>
                        <td data-label="Actions">
                          <div className="admin-actions">
                            <Link
                              href={`/admin/companies/${company.id}`}
                              className="btn btn-sm btn-outline"
                              aria-label={`View ${company.name}`}
                              title="View company"
                            >
                              <Eye size={14} />
                              <span className={styles.viewLabel}>View company</span>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="table-pagination">
              <span>
                {total === 0
                  ? "No companies"
                  : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
              </span>
              <div className="table-pagination-actions">
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={page <= 1}
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} /> Previous
                </button>
                <span className={styles.pageCounter}>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={page >= totalPages}
                  aria-label="Next page"
                >
                  Next <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
