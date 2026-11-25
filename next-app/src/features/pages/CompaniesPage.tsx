"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid, List, ShieldCheck } from "lucide-react";
import { publicCompaniesAPI } from "@/lib/api/client";
import { readClientCache, writeClientCache } from "@/lib/cache/client-cache";
import { getImageUrl, isUnoptimizableImage } from "@/lib/utils/image-url";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Car,
  ChevronLeft,
  ChevronRight,
  Compass,
  MapPin,
  RefreshCw,
  Shield,
} from "@/components/icons";
import styles from "@/features/pages/companies-page.module.css";

type CompanyServicePreview = {
  id: number;
  vehicle?: {
    front_image_url?: string | null;
  } | null;
};

type Company = {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  logo_image_url: string | null;
  cover_image_url: string | null;
  address?: string | null;
  locality: string | null;
  district: string | null;
  region: string | null;
  country: string | null;
  map_url?: string | null;
  contact_phone?: string | null;
  public_path: string;
  services_count: number;
  trips_count?: number;
  website: string | null;
  services?: CompanyServicePreview[];
};

type ViewMode = "grid" | "list";

const PAGE_SIZE = 100;

function formatCompanyLocation(company: Company): string {
  const seen = new Set<string>();
  const parts: string[] = [];
  for (const value of [company.locality, company.district, company.region]) {
    const cleaned = value?.trim();
    if (!cleaned) continue;
    const key = cleaned.toLowerCase();
    if (key === "tanzania" || seen.has(key)) continue;
    seen.add(key);
    parts.push(cleaned);
    if (parts.length >= 1) break;
  }
  if (parts.length === 0) return "Zanzibar";
  if (!parts.some((part) => part.toLowerCase().includes("zanzibar"))) {
    parts.push("Zanzibar");
  }
  return parts.join(", ");
}

function companyMonogram(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter((word) => /[A-Za-z0-9]/.test(word));
  if (words.length === 0) return "CO";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

function buildPageNumbers(current: number, total: number): number[] {
  const maxVisible = 5;
  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, idx) => idx + 1);
  }
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, current - half);
  const end = Math.min(total, start + maxVisible - 1);
  start = Math.max(1, end - maxVisible + 1);
  return Array.from({ length: end - start + 1 }, (_, idx) => start + idx);
}

function CompanyFeaturedCard({ company }: { company: Company }) {
  const locationLabel = formatCompanyLocation(company);
  const servicesCount = Number(company.services_count ?? company.services?.length ?? 0);
  const tripsCount = Number(company.trips_count ?? 0);
  const logoUrl = company.logo_image_url ? getImageUrl(company.logo_image_url) : null;
  const coverRaw =
    company.cover_image_url ||
    company.services?.[0]?.vehicle?.front_image_url ||
    null;
  const coverUrl = coverRaw ? getImageUrl(coverRaw) : null;
  const description =
    company.description?.trim() ||
    "Licensed local transport partner in Zanzibar offering verified private hire vehicles and experienced island drivers.";

  return (
    <article className={styles.fpCard}>
      <div className={styles.fpMedia} aria-hidden="true">
        {coverUrl ? (
          <Image
            src={coverUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 48vw, (max-width: 1024px) 48vw, 380px"
            className={styles.fpImage}
            unoptimized={isUnoptimizableImage(coverUrl)}
          />
        ) : (
          <div className={styles.fpFallback}>
            <span className={styles.fpFallbackCircle}>
              {companyMonogram(company.name)}
            </span>
          </div>
        )}
      </div>
      <span className={styles.fpTopScrim} aria-hidden="true" />

      <div className={styles.fpTopBar}>
        <div className={styles.fpTopLeft}>
          <span className={styles.fpLogoBadge} aria-hidden="true">
            {logoUrl ? (
              <Image
                src={logoUrl}
                alt=""
                fill
                sizes="32px"
                className={styles.fpLogoImg}
                unoptimized={isUnoptimizableImage(logoUrl)}
              />
            ) : (
              companyMonogram(company.name)
            )}
          </span>
          <span className={styles.fpGlassBadge}>
            <ShieldCheck size={12} aria-hidden="true" />
            <span className={styles.fpLabelFull}>Verified company</span>
            <span className={styles.fpLabelShort}>Verified</span>
          </span>
        </div>

        <span className={styles.fpRatingPill}>
          <Car size={11} aria-hidden="true" />
          {servicesCount > 0
            ? `${servicesCount} ${servicesCount === 1 ? "vehicle" : "vehicles"}`
            : "Private hire"}
        </span>
      </div>

      <div className={styles.fpSheet}>
        <div className={styles.fpCopy}>
          <span className={styles.fpKicker}>{locationLabel} · Local Provider</span>
          <h3 className={styles.fpTitle}>
            <Link href={company.public_path} className={styles.fpTitleLink}>
              {company.name}
            </Link>
          </h3>
          <p className={styles.fpDesc}>{description}</p>
        </div>

        <div className={styles.fpBottomRow}>
          <ul className={styles.fpFacts} aria-label="Company highlights">
            <li>
              <MapPin size={12} aria-hidden="true" />
              <span>{locationLabel}</span>
            </li>
            <li>
              <Car size={12} aria-hidden="true" />
              <span>
                {servicesCount > 0
                  ? `${servicesCount} ${servicesCount === 1 ? "service" : "services"}`
                  : "Private fleet"}
              </span>
            </li>
            {tripsCount > 0 ? (
              <li>
                <Compass size={12} aria-hidden="true" />
                <span>
                  {tripsCount} {tripsCount === 1 ? "trip" : "trips"}
                </span>
              </li>
            ) : null}
          </ul>

          <div className={styles.fpActionsRow}>
            <Link href={company.public_path} className={styles.fpPrimaryBtn}>
              <span className={styles.fpLabelFull}>View Company</span>
              <span className={styles.fpLabelShort}>View company</span>
              <ArrowRight size={14} aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const requestSeqRef = useRef(0);
  const directoryTopRef = useRef<HTMLDivElement | null>(null);

  const load = useCallback(async () => {
    const reqId = ++requestSeqRef.current;
    const params: Record<string, string | number> = {
      page,
      page_size: PAGE_SIZE,
    };

    const cacheKey = `travel.companies.v3.${JSON.stringify(params)}`;
    const cached = readClientCache<{ companies: Company[]; total: number }>(cacheKey);
    setError("");

    if (cached) {
      setCompanies(cached.companies);
      setTotal(cached.total);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const res = await publicCompaniesAPI.getAll(params);
      if (reqId !== requestSeqRef.current) return;
      const data = res.data;
      const nextCompanies: Company[] = Array.isArray(data) ? data : data?.results || [];
      const nextTotal: number = Array.isArray(data)
        ? data.length
        : typeof data?.total === "number"
          ? data.total
          : nextCompanies.length;
      setCompanies(nextCompanies);
      setTotal(nextTotal);
      writeClientCache(cacheKey, { companies: nextCompanies, total: nextTotal });
    } catch (err) {
      if (reqId !== requestSeqRef.current) return;
      console.error(err);
      if (!cached) {
        setCompanies([]);
        setTotal(0);
      }
      setError("We could not load the company directory right now. Please try again.");
    } finally {
      if (reqId === requestSeqRef.current) {
        setLoading(false);
      }
    }
  }, [page]);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageNumbers = useMemo(() => buildPageNumbers(page, totalPages), [page, totalPages]);

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    directoryTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const gridClassName =
    viewMode === "list"
      ? styles.fpList
      : `${styles.fpGrid} ${
          companies.length === 1
            ? styles.fpGridSingle
            : companies.length === 2
              ? styles.fpGridDouble
              : ""
        }`;

  return (
    <div id="companies-directory-root" className={`page ${styles.page}`}>
      <div className={styles.content} ref={directoryTopRef}>
        {/* DIRECTORY SECTION HEADER */}
        <header className={styles.sectionHead}>
          <div className={styles.sectionHeadCopy}>
            <span className={styles.sectionEyebrow}>
              <Building2 size={13} aria-hidden="true" />
              Provider directory
            </span>
            <h1 className={styles.sectionTitle}>All companies</h1>
            <p className={styles.sectionLead}>
              Browse verified local providers in Zanzibar and open any company to see all private hire services assigned to it.
            </p>
          </div>

          <div className={styles.sectionHeadControls}>
            <span className={styles.countBadge} aria-live="polite">
              {loading
                ? "Loading directory…"
                : `${total} ${total === 1 ? "company" : "companies"}`}
            </span>

            <div className={styles.viewToggle} role="group" aria-label="Directory layout">
              <button
                type="button"
                className={`${styles.viewToggleBtn} ${
                  viewMode === "grid" ? styles.viewToggleBtnActive : ""
                }`}
                aria-pressed={viewMode === "grid"}
                aria-label="Grid view"
                onClick={() => setViewMode("grid")}
              >
                <LayoutGrid size={15} aria-hidden="true" />
                Grid
              </button>
              <button
                type="button"
                className={`${styles.viewToggleBtn} ${
                  viewMode === "list" ? styles.viewToggleBtnActive : ""
                }`}
                aria-pressed={viewMode === "list"}
                aria-label="List view"
                onClick={() => setViewMode("list")}
              >
                <List size={15} aria-hidden="true" />
                List
              </button>
            </div>
          </div>
        </header>

        {/* LOADING / ERROR / EMPTY / COMPANY CARDS */}
        {loading ? (
          <div className={styles.fpGrid} aria-busy="true" aria-label="Loading companies">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className={styles.fpSkeletonCard} key={index} />
            ))}
          </div>
        ) : error && companies.length === 0 ? (
          <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
            <span className={`${styles.stateIcon} ${styles.stateIconError}`} aria-hidden="true">
              <AlertCircle size={26} />
            </span>
            <h3 className={styles.stateTitle}>Unable to load companies</h3>
            <p className={styles.stateCopy}>{error}</p>
            <div className={styles.stateActions}>
              <button
                type="button"
                className={styles.stateBtnPrimary}
                onClick={() => void load()}
              >
                <RefreshCw size={15} aria-hidden="true" />
                Try again
              </button>
            </div>
          </div>
        ) : companies.length === 0 ? (
          <div className={styles.stateBox}>
            <span className={styles.stateIcon} aria-hidden="true">
              <Building2 size={26} />
            </span>
            <h3 className={styles.stateTitle}>No companies are listed yet</h3>
            <p className={styles.stateCopy}>
              Published company profiles will appear here as soon as verified local operators join the directory.
            </p>
            <div className={styles.stateActions}>
              <Link href="/transport/" className={styles.stateLinkPrimary}>
                Browse private hire
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
              <Link href="/trips/" className={styles.stateLinkSecondary}>
                Explore Zanzibar trips
              </Link>
            </div>
          </div>
        ) : (
          <>
            {error ? (
              <div className={`${styles.stateBox} ${styles.stateBoxError}`} role="alert">
                <p className={styles.stateCopy}>{error}</p>
              </div>
            ) : null}

            <div className={gridClassName}>
              {companies.map((company) => (
                <CompanyFeaturedCard key={company.id} company={company} />
              ))}
            </div>

            {totalPages > 1 ? (
              <nav className={styles.pagination} aria-label="Companies pagination">
                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page <= 1}
                  onClick={() => handlePageChange(Math.max(1, page - 1))}
                >
                  <ChevronLeft size={16} aria-hidden="true" />
                  Previous
                </button>

                {pageNumbers.map((num) => (
                  <button
                    key={num}
                    type="button"
                    className={`${styles.pageBtn} ${styles.pageNumBtn} ${
                      num === page ? styles.pageNumBtnActive : ""
                    }`}
                    aria-current={num === page ? "page" : undefined}
                    onClick={() => handlePageChange(num)}
                  >
                    {num}
                  </button>
                ))}

                <span className={styles.pageMeta}>
                  Page {page} of {totalPages}
                </span>

                <button
                  type="button"
                  className={styles.pageBtn}
                  disabled={page >= totalPages}
                  onClick={() => handlePageChange(Math.min(totalPages, page + 1))}
                >
                  Next
                  <ChevronRight size={16} aria-hidden="true" />
                </button>
              </nav>
            ) : null}
          </>
        )}

        {/* OPERATOR PARTNERSHIP CALLOUT */}
        <section className={styles.partnerStrip} aria-labelledby="partner-callout-heading">
          <div className={styles.partnerCopy}>
            <span className={styles.partnerKicker}>
              <Shield size={13} aria-hidden="true" />
              For tourism &amp; transport operators
            </span>
            <h2 id="partner-callout-heading" className={styles.partnerTitle}>
              Run private transfers or curated trips in Zanzibar?
            </h2>
            <p className={styles.partnerText}>
              Publish your company profile, vehicles, and direct routes so travelers can compare
              your services and send booking requests in one place.
            </p>
          </div>
          <div className={styles.partnerActions}>
            <Link href="/contact/" className={styles.stateLinkPrimary}>
              Partner with us
              <ArrowRight size={15} aria-hidden="true" />
            </Link>
            <Link href="/transport/" className={styles.stateLinkSecondary}>
              View active fleet
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
