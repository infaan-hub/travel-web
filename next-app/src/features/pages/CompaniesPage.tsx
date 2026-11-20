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
  Search,
  Shield,
  X,
} from "@/components/icons";
import { PageHero } from "@/components/PageHero";
import styles from "@/features/pages/companies-page.module.css";

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
};

type SortMode = "name" | "services" | "trips";
type ViewMode = "grid" | "list";

const PAGE_SIZE = 12;
const DEFAULT_REGION_SUGGESTIONS = ["Zanzibar", "Unguja", "Stone Town", "Dar es Salaam", "Arusha"];

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
  const [searchInput, setSearchInput] = useState("");
  const [regionInput, setRegionInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [debouncedRegion, setDebouncedRegion] = useState("");
  const [sortBy, setSortBy] = useState<SortMode>("name");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [knownRegions, setKnownRegions] = useState<string[]>([]);

  const requestSeqRef = useRef(0);
  const directoryTopRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 220);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedRegion(regionInput.trim());
    }, 220);
    return () => window.clearTimeout(timer);
  }, [regionInput]);

  const load = useCallback(async () => {
    const reqId = ++requestSeqRef.current;
    const params: Record<string, string | number> = {
      page,
      page_size: PAGE_SIZE,
    };
    if (debouncedSearch) params.search = debouncedSearch;
    if (debouncedRegion) params.region = debouncedRegion;

    const cacheKey = `travel.companies.${JSON.stringify(params)}`;
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

      const discoveredRegions = nextCompanies
        .map((item) => item.region?.trim() || "")
        .filter(Boolean);
      if (discoveredRegions.length > 0) {
        setKnownRegions((prev) => {
          const merged = new Map<string, string>();
          for (const entry of [...prev, ...discoveredRegions]) {
            const key = entry.toLowerCase();
            if (!merged.has(key)) merged.set(key, entry);
          }
          return Array.from(merged.values());
        });
      }
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
  }, [debouncedSearch, debouncedRegion, page]);

  useEffect(() => {
    void load(); // eslint-disable-line react-hooks/set-state-in-effect
  }, [load]);

  const sortedCompanies = useMemo(() => {
    if (sortBy === "services") {
      return [...companies].sort(
        (a, b) => (b.services_count ?? 0) - (a.services_count ?? 0) || a.name.localeCompare(b.name),
      );
    }
    if (sortBy === "trips") {
      return [...companies].sort(
        (a, b) => (b.trips_count ?? 0) - (a.trips_count ?? 0) || a.name.localeCompare(b.name),
      );
    }
    return companies;
  }, [companies, sortBy]);

  const quickRegionOptions = useMemo(() => {
    const merged = new Map<string, string>();
    for (const candidate of [...knownRegions, ...DEFAULT_REGION_SUGGESTIONS]) {
      const cleaned = candidate.trim();
      if (!cleaned) continue;
      const key = cleaned.toLowerCase();
      if (!merged.has(key)) merged.set(key, cleaned);
      if (merged.size >= 6) break;
    }
    return Array.from(merged.values());
  }, [knownRegions]);

  const aggregateStats = useMemo(() => {
    return companies.reduce(
      (acc, item) => ({
        services: acc.services + (item.services_count ?? 0),
        trips: acc.trips + (item.trips_count ?? 0),
      }),
      { services: 0, trips: 0 },
    );
  }, [companies]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageNumbers = useMemo(() => buildPageNumbers(page, totalPages), [page, totalPages]);
  const hasFilters = Boolean(searchInput.trim() || regionInput.trim());

  const handleSelectRegionChip = (selected: string) => {
    const next = regionInput.trim().toLowerCase() === selected.toLowerCase() ? "" : selected;
    setRegionInput(next);
    setDebouncedRegion(next);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearchInput("");
    setRegionInput("");
    setDebouncedSearch("");
    setDebouncedRegion("");
    setSortBy("name");
    setPage(1);
  };

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage);
    directoryTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div id="companies-directory-root" className={`page ${styles.page}`}>
      <PageHero
        eyebrow="Verified tourism & transport providers"
        title="Meet the companies behind every journey"
        subtitle="Compare vetted local operators, service areas, active vehicles, and published trips before you book."
        backgroundImageKey="feature"
        patternImageKey="thumb"
        ctaPrimary={{ label: "Browse private hire", href: "/transport/" }}
        ctaSecondary={{ label: "Measure & plan trips", href: "/trips/" }}
      >
        <div className={styles.heroStats}>
          <span className={styles.heroStatPill}>
            <strong>{loading ? "—" : total}</strong>{" "}
            {total === 1 ? "Listed company" : "Listed companies"}
          </span>
          <span className={styles.heroStatPill}>
            <strong>{loading ? "—" : aggregateStats.services}</strong>{" "}
            {aggregateStats.services === 1 ? "Private-hire service" : "Private-hire services"}
          </span>
          <span className={styles.heroStatPill}>
            <strong>{loading ? "—" : aggregateStats.trips}</strong>{" "}
            {aggregateStats.trips === 1 ? "Published trip" : "Published trips"}
          </span>
        </div>
      </PageHero>

      <div className={styles.content} ref={directoryTopRef}>
        {/* ELEVATED SEARCH & FILTER COMMAND BAR */}
        <section className={styles.toolbarCard} aria-label="Filter companies">
          <div className={styles.toolbarFields}>
            <div className={styles.fieldGroup}>
              <label htmlFor="companies-search" className={styles.fieldLabel}>
                Search operators
              </label>
              <div className={styles.inputShell}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <Search size={17} />
                </span>
                <input
                  id="companies-search"
                  type="search"
                  className={styles.textInput}
                  value={searchInput}
                  onChange={(event) => {
                    setPage(1);
                    setSearchInput(event.target.value);
                  }}
                  placeholder="Company name, locality, or service…"
                />
                {searchInput ? (
                  <button
                    type="button"
                    className={styles.clearFieldBtn}
                    aria-label="Clear search"
                    onClick={() => {
                      setSearchInput("");
                      setDebouncedSearch("");
                      setPage(1);
                    }}
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="companies-region" className={styles.fieldLabel}>
                Region
              </label>
              <div className={styles.inputShell}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <MapPin size={17} />
                </span>
                <input
                  id="companies-region"
                  type="text"
                  className={styles.textInput}
                  value={regionInput}
                  onChange={(event) => {
                    setPage(1);
                    setRegionInput(event.target.value);
                  }}
                  placeholder="e.g. Zanzibar, Unguja, Arusha"
                />
                {regionInput ? (
                  <button
                    type="button"
                    className={styles.clearFieldBtn}
                    aria-label="Clear region filter"
                    onClick={() => {
                      setRegionInput("");
                      setDebouncedRegion("");
                      setPage(1);
                    }}
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
            </div>

            <div className={styles.fieldGroup}>
              <label htmlFor="companies-sort" className={styles.fieldLabel}>
                Sort by
              </label>
              <select
                id="companies-sort"
                className={styles.selectInput}
                value={sortBy}
                onChange={(event) => setSortBy(event.target.value as SortMode)}
              >
                <option value="name">Name (A–Z)</option>
                <option value="services">Most private-hire services</option>
                <option value="trips">Most published trips</option>
              </select>
            </div>
          </div>

          <div className={styles.toolbarBottom}>
            <div className={styles.regionChips} role="group" aria-label="Quick region filters">
              <span className={styles.regionChipsLabel}>Regions:</span>
              <button
                type="button"
                className={`${styles.regionChip} ${
                  !regionInput.trim() ? styles.regionChipActive : ""
                }`}
                aria-pressed={!regionInput.trim()}
                onClick={() => {
                  setRegionInput("");
                  setDebouncedRegion("");
                  setPage(1);
                }}
              >
                All
              </button>
              {quickRegionOptions.map((option) => {
                const isActive = regionInput.trim().toLowerCase() === option.toLowerCase();
                return (
                  <button
                    key={option}
                    type="button"
                    className={`${styles.regionChip} ${isActive ? styles.regionChipActive : ""}`}
                    aria-pressed={isActive}
                    onClick={() => handleSelectRegionChip(option)}
                  >
                    {option}
                  </button>
                );
              })}
            </div>

            {hasFilters ? (
              <button
                type="button"
                className={styles.resetFiltersBtn}
                onClick={handleResetFilters}
              >
                <X size={14} aria-hidden="true" />
                Reset filters
              </button>
            ) : null}
          </div>
        </section>

        {/* DIRECTORY SECTION HEADER */}
        <header className={styles.sectionHead}>
          <div className={styles.sectionHeadCopy}>
            <span className={styles.sectionEyebrow}>
              <Building2 size={13} aria-hidden="true" />
              Provider directory
            </span>
            <h2 className={styles.sectionTitle}>Published companies</h2>
            <p className={styles.sectionLead}>
              Inspect verified operator profiles, coverage areas, private-hire fleets, and published trips.
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
            <h3 className={styles.stateTitle}>
              {hasFilters ? "No companies match your filters" : "No companies are listed yet"}
            </h3>
            <p className={styles.stateCopy}>
              {hasFilters
                ? "Try broadening your search keyword or clearing the region filter to view all published providers."
                : "Published company profiles will appear here as soon as verified local operators join the directory."}
            </p>
            <div className={styles.stateActions}>
              {hasFilters ? (
                <button
                  type="button"
                  className={styles.stateBtnPrimary}
                  onClick={handleResetFilters}
                >
                  <X size={15} aria-hidden="true" />
                  Clear all filters
                </button>
              ) : (
                <>
                  <Link href="/transport/" className={styles.stateLinkPrimary}>
                    Browse private hire
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                  <Link href="/trips/" className={styles.stateLinkSecondary}>
                    Explore Zanzibar trips
                  </Link>
                </>
              )}
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
