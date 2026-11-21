"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { CalendarCheck2, LayoutGrid, List, ShieldCheck } from "lucide-react";
import { publicCompaniesAPI } from "@/lib/api/client";
import { readClientCache, writeClientCache } from "@/lib/cache/client-cache";
import { getImageUrl } from "@/lib/utils/image-url";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  Car,
  ChevronLeft,
  ChevronRight,
  Compass,
  MapPin,
  RefreshCw,
  Shield,
  Users,
} from "@/components/icons";
import { PRICING_LABELS } from "@/features/transport/private-hire-data";
import styles from "@/features/pages/companies-page.module.css";

type CompanyPrivateService = {
  id: number;
  title: string;
  description?: string | null;
  price: string | number;
  pricing_type?: string | null;
  vehicle?: {
    name?: string | null;
    plate_number?: string | null;
    category?: string | null;
    capacity?: number | null;
    luggage_capacity?: number | null;
    front_image_url?: string | null;
    side_image_url?: string | null;
    back_image_url?: string | null;
  } | null;
  driver?: {
    name?: string | null;
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
  services?: CompanyPrivateService[];
};

type ViewMode = "grid" | "list";

const PAGE_SIZE = 100;

function formatLocation(company: Company): string {
  const parts = [company.locality, company.district, company.region, company.country]
    .map((part) => part?.trim() || "")
    .filter(Boolean);
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const part of parts) {
    const key = part.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(part);
    }
  }
  return unique.join(", ") || "Tanzania";
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
  const [serviceIndex, setServiceIndex] = useState(0);
  const [angleIndex, setAngleIndex] = useState(0);

  const services = Array.isArray(company.services) ? company.services : [];
  const activeService = services[serviceIndex] ?? services[0] ?? null;
  const locationLabel = formatLocation(company);
  const regionBadge = company.region?.trim() || company.country?.trim() || "Zanzibar";
  const tripsCount = company.trips_count ?? 0;
  const servicesCount = Number(company.services_count ?? services.length);
  const logoUrl = company.logo_image_url ? getImageUrl(company.logo_image_url) : null;

  const vehicle = activeService?.vehicle ?? null;
  const vehicleName = vehicle?.name?.trim() || activeService?.title || "Private vehicle";
  const plateNumber = vehicle?.plate_number?.trim() || "";
  const seats = Number(vehicle?.capacity ?? 0);
  const bags = Number(vehicle?.luggage_capacity ?? 0);

  const priceNum = activeService ? Number(activeService.price) : NaN;
  const priceText = activeService
    ? Number.isFinite(priceNum)
      ? `$${Number.isInteger(priceNum) ? priceNum : priceNum.toFixed(2)}`
      : `$${activeService.price}`
    : "";
  const pricingKey = activeService?.pricing_type || "per_trip";
  const pricingLabel = PRICING_LABELS[pricingKey] || pricingKey.replace(/_/g, " ");

  const vehiclePhotos = [
    { label: "Front", url: vehicle?.front_image_url ?? null },
    { label: "Side", url: vehicle?.side_image_url ?? null },
    { label: "Back", url: vehicle?.back_image_url ?? null },
  ].filter((item): item is { label: string; url: string } => Boolean(item.url));

  const activeVehiclePhoto = vehiclePhotos[angleIndex] ?? vehiclePhotos[0] ?? null;
  const bgUrl = activeVehiclePhoto?.url
    ? getImageUrl(activeVehiclePhoto.url)
    : company.cover_image_url
      ? getImageUrl(company.cover_image_url)
      : null;

  const subtitle =
    activeService?.title?.trim() ||
    company.description?.trim() ||
    "Verified local tourism and transport provider offering direct bookings.";

  const kickerParts = [
    locationLabel,
    `${servicesCount} ${servicesCount === 1 ? "hire service" : "hire services"}`,
    ...(tripsCount > 0
      ? [`${tripsCount} ${tripsCount === 1 ? "trip" : "trips"}`]
      : []),
  ];

  return (
    <article className={styles.fpCard}>
      <div className={styles.fpMedia} aria-hidden="true">
        {bgUrl ? (
          <Image
            src={bgUrl}
            alt=""
            fill
            sizes="(max-width: 640px) 48vw, (max-width: 1024px) 48vw, 380px"
            className={styles.fpImage}
            unoptimized
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
                unoptimized
              />
            ) : (
              companyMonogram(company.name)
            )}
          </span>
          <span className={styles.fpGlassBadge}>
            <ShieldCheck size={12} aria-hidden="true" />
            <span className={styles.fpLabelFull}>Verified · {regionBadge}</span>
            <span className={styles.fpLabelShort}>Verified</span>
          </span>
        </div>

        {activeService ? (
          <div className={styles.fpPriceBox}>
            <span className={styles.fpPriceValue}>{priceText}</span>
            <span className={styles.fpPriceUnit}>/ {pricingLabel}</span>
          </div>
        ) : (
          <span className={styles.fpRatingPill}>
            <Compass size={11} aria-hidden="true" />
            {tripsCount > 0
              ? `${tripsCount} ${tripsCount === 1 ? "trip" : "trips"}`
              : regionBadge}
          </span>
        )}
      </div>

      <div className={styles.fpSheet}>
        <div className={styles.fpBodyRow}>
          <div className={styles.fpCopy}>
            <span className={styles.fpKicker}>{kickerParts.join(" · ")}</span>
            <h3 className={styles.fpTitle}>
              <Link href={company.public_path} className={styles.fpTitleLink}>
                {company.name}
              </Link>
            </h3>
            {subtitle ? <p className={styles.fpDesc}>{subtitle}</p> : null}
          </div>

          {services.length > 1 ? (
            <div className={styles.fpAnglePills} role="tablist" aria-label="Company services">
              {services.slice(0, 4).map((svc, idx) => (
                <button
                  key={svc.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === serviceIndex}
                  className={`${styles.fpAngleBtn} ${
                    idx === serviceIndex ? styles.fpAngleBtnActive : ""
                  }`}
                  onClick={() => {
                    setServiceIndex(idx);
                    setAngleIndex(0);
                  }}
                >
                  {svc.vehicle?.name?.trim() || `Option ${idx + 1}`}
                </button>
              ))}
            </div>
          ) : vehiclePhotos.length > 1 ? (
            <div className={styles.fpAnglePills} role="tablist" aria-label="Vehicle photo angle">
              {vehiclePhotos.map((photo, index) => (
                <button
                  key={photo.label}
                  type="button"
                  role="tab"
                  aria-selected={index === angleIndex}
                  className={`${styles.fpAngleBtn} ${
                    index === angleIndex ? styles.fpAngleBtnActive : ""
                  }`}
                  onClick={() => setAngleIndex(index)}
                >
                  {photo.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div className={styles.fpBottomRow}>
          <ul className={styles.fpFacts} aria-label="Company highlights">
            {activeService ? (
              <>
                <li>
                  <Car size={12} aria-hidden="true" />
                  <span>{vehicleName}</span>
                  {plateNumber ? <em>{plateNumber}</em> : null}
                </li>
                {seats > 0 ? (
                  <li>
                    <Users size={12} aria-hidden="true" />
                    <span>{seats} pax</span>
                  </li>
                ) : null}
                {bags > 0 ? (
                  <li>
                    <Briefcase size={12} aria-hidden="true" />
                    <span>{bags} bags</span>
                  </li>
                ) : null}
              </>
            ) : (
              <>
                <li>
                  <MapPin size={12} aria-hidden="true" />
                  <span>{locationLabel}</span>
                </li>
                <li>
                  <Car size={12} aria-hidden="true" />
                  <span>0 hire services</span>
                </li>
                <li>
                  <Compass size={12} aria-hidden="true" />
                  <span>
                    {tripsCount} {tripsCount === 1 ? "trip" : "trips"}
                  </span>
                </li>
              </>
            )}
          </ul>

          <div className={styles.fpActionsRow}>
            {activeService ? (
              <>
                <Link href={company.public_path} className={styles.fpGhostBtn}>
                  Profile
                </Link>
                <Link
                  href={`/transport/service/${activeService.id}/`}
                  className={`${styles.fpGhostBtn} ${styles.fpDetailsGhost}`}
                >
                  Details
                </Link>
                <Link href={`/booking/${activeService.id}/`} className={styles.fpPrimaryBtn}>
                  <CalendarCheck2 size={14} aria-hidden="true" />
                  <span className={styles.fpLabelFull}>Book This Service</span>
                  <span className={styles.fpLabelShort}>Book now</span>
                </Link>
              </>
            ) : (
              <Link href={company.public_path} className={styles.fpPrimaryBtn}>
                <span className={styles.fpLabelFull}>View company profile</span>
                <span className={styles.fpLabelShort}>Profile</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            )}
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
              Browse all verified companies, compare their private hire services, and book directly.
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
