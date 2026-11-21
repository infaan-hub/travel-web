"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { LayoutGrid, List } from "lucide-react";
import { publicCompaniesAPI } from "@/lib/api/client";
import { readClientCache, writeClientCache } from "@/lib/cache/client-cache";
import { getImageUrl } from "@/lib/utils/image-url";
import {
  AlertCircle,
  ArrowRight,
  Briefcase,
  Building2,
  Car,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Compass,
  Globe,
  MapPin,
  Navigation,
  Phone,
  RefreshCw,
  Shield,
  Users,
} from "@/components/icons";
import { PRICING_LABELS } from "@/features/transport/private-hire-data";
import styles from "@/features/pages/companies-page.module.css";

type CompanyPrivateService = {
  id: number;
  title: string;
  price: string | number;
  pricing_type?: string | null;
  vehicle?: {
    name?: string | null;
    plate_number?: string | null;
    category?: string | null;
    capacity?: number | null;
    luggage_capacity?: number | null;
    front_image_url?: string | null;
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

const PAGE_SIZE = 12;

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
  return unique.join(", ") || "Verified operator profile";
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

function safeExternalUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return null;
  } catch {
    return null;
  }
}

function safeTelHref(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const cleaned = raw.replace(/[^\d+]/g, "");
  return cleaned.length >= 6 ? `tel:${cleaned}` : null;
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

    const cacheKey = `travel.companies.v2.${JSON.stringify(params)}`;
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

  const sortedCompanies = companies;

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageNumbers = useMemo(() => buildPageNumbers(page, totalPages), [page, totalPages]);

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    directoryTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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
            <h1 className={styles.sectionTitle}>Published companies</h1>
            <p className={styles.sectionLead}>
              Browse verified companies, compare all their private hire services, and select a vehicle to book directly.
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
          <div className={styles.grid} aria-busy="true" aria-label="Loading companies">
            {Array.from({ length: 6 }).map((_, index) => (
              <article className={styles.card} key={index}>
                <div className={styles.skeletonCover} />
                <div className={styles.cardBody}>
                  <div className={styles.skeletonAvatar} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonTitle}`} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonMeta}`} />
                  <div className={styles.skeletonLine} />
                  <div className={`${styles.skeletonLine} ${styles.skeletonShort}`} />
                  <div className={styles.skeletonTiles}>
                    <div className={styles.skeletonTile} />
                    <div className={styles.skeletonTile} />
                  </div>
                  <div className={styles.skeletonBtn} />
                </div>
              </article>
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
        ) : sortedCompanies.length === 0 ? (
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

            <div className={viewMode === "list" ? styles.list : styles.grid}>
              {sortedCompanies.map((company) => {
                const locationLabel = formatLocation(company);
                const websiteUrl = safeExternalUrl(company.website);
                const mapUrl = safeExternalUrl(company.map_url);
                const telHref = safeTelHref(company.contact_phone);
                const tripsCount = company.trips_count ?? 0;
                const regionBadge = company.region?.trim() || company.country?.trim() || "Zanzibar";

                return (
                  <article className={styles.card} key={company.id}>
                    <Link
                      href={company.public_path}
                      className={styles.coverStage}
                      aria-label={`Open ${company.name} profile`}
                    >
                      {company.cover_image_url ? (
                        <Image
                          className={styles.coverImage}
                          src={getImageUrl(company.cover_image_url)}
                          alt=""
                          fill
                          unoptimized
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        />
                      ) : (
                        <div className={styles.coverFallback}>
                          <span className={styles.coverFallbackPattern} aria-hidden="true" />
                          <span className={styles.coverFallbackMark} aria-hidden="true">
                            <Building2 size={26} />
                          </span>
                        </div>
                      )}
                      <span className={styles.coverScrim} aria-hidden="true" />
                      <div className={styles.coverTopBadges}>
                        <span className={styles.verifiedPill}>
                          <CheckCircle size={12} aria-hidden="true" />
                          Verified
                        </span>
                        <span className={styles.regionPill}>{regionBadge}</span>
                      </div>
                    </Link>

                    <div className={styles.cardBody}>
                      <div className={styles.avatarRow}>
                        <div className={styles.logoWrap}>
                          {company.logo_image_url ? (
                            <Image
                              className={styles.logoImage}
                              src={getImageUrl(company.logo_image_url)}
                              alt={`${company.name} logo`}
                              width={56}
                              height={56}
                              unoptimized
                            />
                          ) : (
                            <span className={styles.logoMonogram} aria-hidden="true">
                              {companyMonogram(company.name)}
                            </span>
                          )}
                        </div>

                        {(websiteUrl || mapUrl || telHref) ? (
                          <div className={styles.quickLinks}>
                            {websiteUrl ? (
                              <a
                                href={websiteUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.quickLink}
                                aria-label={`Visit ${company.name} website`}
                                title="Website"
                              >
                                <Globe size={15} aria-hidden="true" />
                              </a>
                            ) : null}
                            {mapUrl ? (
                              <a
                                href={mapUrl}
                                target="_blank"
                                rel="noreferrer"
                                className={styles.quickLink}
                                aria-label={`View ${company.name} on map`}
                                title="View on map"
                              >
                                <Navigation size={15} aria-hidden="true" />
                              </a>
                            ) : null}
                            {telHref ? (
                              <a
                                href={telHref}
                                className={styles.quickLink}
                                aria-label={`Call ${company.name}`}
                                title="Call company"
                              >
                                <Phone size={15} aria-hidden="true" />
                              </a>
                            ) : null}
                          </div>
                        ) : null}
                      </div>

                      <div className={styles.identityBlock}>
                        <h3 className={styles.cardTitle}>
                          <Link href={company.public_path} className={styles.cardTitleLink}>
                            {company.name}
                          </Link>
                        </h3>
                        <p className={styles.locationLine}>
                          <MapPin size={13} aria-hidden="true" />
                          <span>{locationLabel}</span>
                        </p>
                      </div>

                      <p className={styles.description}>
                        {company.description?.trim() ||
                          "Verified local tourism and transport provider offering direct bookings and regional coverage."}
                      </p>

                      <div className={styles.metricsStrip}>
                        <div className={styles.metricTile}>
                          <span className={styles.metricIcon} aria-hidden="true">
                            <Car size={14} />
                          </span>
                          <div className={styles.metricCopy}>
                            <strong className={styles.metricValue}>
                              {company.services_count}
                            </strong>
                            <span className={styles.metricLabel}>
                              {company.services_count === 1 ? "Hire service" : "Hire services"}
                            </span>
                          </div>
                        </div>

                        <div className={styles.metricTile}>
                          <span className={styles.metricIcon} aria-hidden="true">
                            <Compass size={14} />
                          </span>
                          <div className={styles.metricCopy}>
                            <strong className={styles.metricValue}>{tripsCount}</strong>
                            <span className={styles.metricLabel}>
                              {tripsCount === 1 ? "Published trip" : "Published trips"}
                            </span>
                          </div>
                        </div>
                      </div>

                      {Array.isArray(company.services) && company.services.length > 0 ? (
                        <div className={styles.companyServicesBlock}>
                          <div className={styles.companyServicesHead}>
                            <span className={styles.companyServicesTitle}>
                              <Car size={13} aria-hidden="true" />
                              Private hire services
                            </span>
                            <span className={styles.companyServicesCount}>
                              {company.services.length}{" "}
                              {company.services.length === 1 ? "option" : "options"}
                            </span>
                          </div>

                          <ul className={styles.companyServicesList}>
                            {company.services.map((svc) => {
                              const vehicleName = svc.vehicle?.name?.trim() || svc.title;
                              const plate = svc.vehicle?.plate_number?.trim() || "";
                              const seats = Number(svc.vehicle?.capacity ?? 0);
                              const bags = Number(svc.vehicle?.luggage_capacity ?? 0);
                              const thumb = svc.vehicle?.front_image_url
                                ? getImageUrl(svc.vehicle.front_image_url)
                                : null;
                              const priceNum = Number(svc.price);
                              const priceText = Number.isFinite(priceNum)
                                ? `$${Number.isInteger(priceNum) ? priceNum : priceNum.toFixed(2)}`
                                : `$${svc.price}`;
                              const pricingKey = svc.pricing_type || "per_trip";
                              const pricingLabel =
                                PRICING_LABELS[pricingKey] || pricingKey.replace(/_/g, " ");

                              return (
                                <li key={svc.id} className={styles.companyServiceItem}>
                                  <div className={styles.companyServiceMain}>
                                    <Link
                                      href={`/booking/${svc.id}/`}
                                      className={styles.companyServiceThumb}
                                      aria-label={`Book ${vehicleName} with ${company.name}`}
                                    >
                                      {thumb ? (
                                        <Image
                                          src={thumb}
                                          alt=""
                                          fill
                                          sizes="56px"
                                          className={styles.companyServiceThumbImg}
                                          unoptimized
                                        />
                                      ) : (
                                        <Car size={18} aria-hidden="true" />
                                      )}
                                    </Link>

                                    <div className={styles.companyServiceInfo}>
                                      <div className={styles.companyServiceTop}>
                                        <Link
                                          href={`/booking/${svc.id}/`}
                                          className={styles.companyServiceName}
                                        >
                                          {vehicleName}
                                        </Link>
                                        {plate ? (
                                          <span className={styles.companyServicePlate}>{plate}</span>
                                        ) : null}
                                      </div>

                                      {svc.title &&
                                      svc.title.trim().toLowerCase() !==
                                        vehicleName.toLowerCase() ? (
                                        <p className={styles.companyServiceSub}>{svc.title}</p>
                                      ) : null}

                                      <div className={styles.companyServiceMeta}>
                                        <span className={styles.companyServicePrice}>
                                          <strong>{priceText}</strong>/{pricingLabel}
                                        </span>
                                        {seats > 0 ? (
                                          <span className={styles.companyServiceSpec}>
                                            <Users size={12} aria-hidden="true" />
                                            {seats}
                                          </span>
                                        ) : null}
                                        {bags > 0 ? (
                                          <span className={styles.companyServiceSpec}>
                                            <Briefcase size={12} aria-hidden="true" />
                                            {bags}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>

                                  <div className={styles.companyServiceActions}>
                                    <Link
                                      href={`/transport/service/${svc.id}/`}
                                      className={styles.serviceDetailLink}
                                    >
                                      Details
                                    </Link>
                                    <Link
                                      href={`/booking/${svc.id}/`}
                                      className={styles.serviceBookLink}
                                    >
                                      Book now
                                      <ArrowRight size={13} aria-hidden="true" />
                                    </Link>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      ) : null}

                      <div className={styles.cardFooter}>
                        <Link className={styles.profileCta} href={company.public_path}>
                          View company profile
                          <ArrowRight size={15} aria-hidden="true" />
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
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
