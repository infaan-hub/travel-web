"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { publicDriversAPI } from "@/lib/api/client";
import { readClientCache, writeClientCache } from "@/lib/cache/client-cache";
import { getImageUrl } from "@/lib/utils/image-url";
import type { PublicDriverCard } from "@/lib/featured-drivers";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Car,
  Navigation,
  RefreshCw,
  Search,
  Shield,
  Star,
  Users,
  X,
} from "@/components/icons";
import styles from "@/features/pages/drivers-directory.module.css";

type DriverFilterType = "all" | "company" | "public";

function driverInitials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (words.length === 0) return "DR";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0][0]}${words[1][0]}`.toUpperCase();
}

export default function DriversDirectoryPage() {
  const [drivers, setDrivers] = useState<PublicDriverCard[]>(
    () => readClientCache<PublicDriverCard[]>("travel.publicDrivers.all") ?? [],
  );
  const [loading, setLoading] = useState<boolean>(
    () => !readClientCache<PublicDriverCard[]>("travel.publicDrivers.all"),
  );
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterType, setFilterType] = useState<DriverFilterType>("all");
  const [reloadNonce, setReloadNonce] = useState(0);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 200);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;
    const reqId = ++requestSeqRef.current;
    const params: Record<string, string> = {};
    if (debouncedSearch) params.search = debouncedSearch;
    if (filterType !== "all") params.type = filterType;

    const cacheKey = `travel.publicDrivers.${filterType}.${debouncedSearch.toLowerCase() || "all"}`;
    const cached = readClientCache<PublicDriverCard[]>(cacheKey);

    Promise.resolve()
      .then(async () => {
        if (!active || reqId !== requestSeqRef.current) return;
        setError("");
        if (cached) {
          setDrivers(cached);
          setLoading(false);
        } else {
          setLoading(true);
        }

        const res = await publicDriversAPI.getAll(params);
        if (!active || reqId !== requestSeqRef.current) return;
        const list: PublicDriverCard[] = Array.isArray(res.data?.results)
          ? res.data.results
          : Array.isArray(res.data)
            ? res.data
            : [];
        setDrivers(list);
        writeClientCache(cacheKey, list);
      })
      .catch((err) => {
        if (!active || reqId !== requestSeqRef.current) return;
        console.error(err);
        if (!cached) setDrivers([]);
        setError("We could not load the drivers directory right now. Please try again.");
      })
      .finally(() => {
        if (active && reqId === requestSeqRef.current) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [debouncedSearch, filterType, reloadNonce]);

  const hasFilters = Boolean(searchInput.trim() || filterType !== "all");

  return (
    <div className={`page ${styles.pageRoot}`}>
      <div className={styles.shell}>
        <div className={styles.topBar}>
          <Link href="/" className={styles.backLink}>
            <ArrowLeft size={15} aria-hidden="true" />
            Back to home
          </Link>
        </div>

        <header className={styles.header}>
          <div className={styles.headerCopy}>
            <span className={styles.eyebrow}>
              <Users size={14} aria-hidden="true" />
              Verified drivers
            </span>
            <h1 className={styles.title}>Top Zanzibar drivers</h1>
            <p className={styles.lead}>
              Meet approved company and public hire drivers ready for airport transfers, resort rides,
              and private island trips.
            </p>
          </div>
          <span className={styles.countPill} aria-live="polite">
            {loading ? "Loading..." : `${drivers.length} ${drivers.length === 1 ? "driver" : "drivers"}`}
          </span>
        </header>

        <section className={styles.toolbar} aria-label="Filter drivers">
          <div className={styles.searchWrap}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="search"
              className={styles.searchInput}
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by driver name, company, or vehicle..."
              aria-label="Search drivers"
            />
            {searchInput ? (
              <button
                type="button"
                className={styles.clearBtn}
                onClick={() => {
                  setSearchInput("");
                  setDebouncedSearch("");
                }}
                aria-label="Clear search"
              >
                <X size={14} aria-hidden="true" />
              </button>
            ) : null}
          </div>

          <div className={styles.filterTabs} role="group" aria-label="Driver category">
            {(
              [
                ["all", "All drivers"],
                ["company", "Company"],
                ["public", "Public hire"],
              ] as const
            ).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={`${styles.filterTab} ${
                  filterType === value ? styles.filterTabActive : ""
                }`}
                aria-pressed={filterType === value}
                onClick={() => setFilterType(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        {loading ? (
          <div className={styles.grid} aria-busy="true" aria-label="Loading drivers">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className={styles.skeletonCard}>
                <div className={styles.skeletonMedia} />
                <div className={styles.skeletonBody}>
                  <div className={styles.skeletonTitle} />
                  <div className={styles.skeletonLine} />
                  <div className={styles.skeletonAction} />
                </div>
              </div>
            ))}
          </div>
        ) : error && drivers.length === 0 ? (
          <div className={styles.stateBox} role="alert">
            <AlertCircle size={26} aria-hidden="true" />
            <h2 className={styles.stateTitle}>Unable to load drivers</h2>
            <p className={styles.stateCopy}>{error}</p>
            <button
              type="button"
              className={styles.stateAction}
              onClick={() => setReloadNonce((n) => n + 1)}
            >
              <RefreshCw size={15} aria-hidden="true" />
              Try again
            </button>
          </div>
        ) : drivers.length === 0 ? (
          <div className={styles.stateBox}>
            <Users size={26} aria-hidden="true" />
            <h2 className={styles.stateTitle}>
              {hasFilters ? "No drivers match your filter" : "No drivers listed right now"}
            </h2>
            <p className={styles.stateCopy}>
              {hasFilters
                ? "Try clearing your search or switching to All drivers."
                : "Approved company and public hire drivers will appear here as soon as they are active."}
            </p>
            {hasFilters ? (
              <button
                type="button"
                className={styles.stateAction}
                onClick={() => {
                  setSearchInput("");
                  setDebouncedSearch("");
                  setFilterType("all");
                }}
              >
                Reset filters
              </button>
            ) : (
              <Link href="/booking/create/" className={styles.stateLink}>
                Request Private hire Transport
                <ArrowRight size={15} aria-hidden="true" />
              </Link>
            )}
          </div>
        ) : (
          <ul className={styles.grid}>
            {drivers.map((driver) => {
              const avatarUrl = driver.image_url ? getImageUrl(driver.image_url) : null;
              const bookHref = driver.service_id
                ? `/booking/${driver.service_id}/`
                : "/booking/create/";
              const bookLabel = driver.service_id ? "Book driver" : "Request trip";

              return (
                <li key={driver.id} className={styles.card}>
                  <div className={styles.cardVisual}>
                    {avatarUrl ? (
                      <Image
                        src={avatarUrl}
                        alt={driver.name}
                        fill
                        sizes="(max-width: 640px) 46vw, (max-width: 1024px) 32vw, 24vw"
                        className={styles.driverPhoto}
                        unoptimized
                      />
                    ) : (
                      <div className={styles.avatarFallback} aria-hidden="true">
                        <span className={styles.avatarCircle}>{driverInitials(driver.name)}</span>
                      </div>
                    )}
                    <span className={styles.visualShade} aria-hidden="true" />
                    <span className={styles.verifiedTag}>
                      <Shield size={11} aria-hidden="true" />
                      Verified
                    </span>
                    {driver.average_rating != null ? (
                      <span className={styles.ratingTag} aria-label={`Rated ${driver.average_rating.toFixed(1)} out of 5`}>
                        <Star size={11} fill="#f59e0b" color="#f59e0b" aria-hidden="true" />
                        {driver.average_rating.toFixed(1)}
                      </span>
                    ) : null}
                  </div>

                  <div className={styles.cardBody}>
                    <div className={styles.nameBlock}>
                      <h2 className={styles.driverName}>{driver.name}</h2>
                      <p className={styles.affiliation}>
                        {driver.company ? (
                          <>
                            <Building2 size={12} aria-hidden="true" />
                            <span>{driver.company.name}</span>
                          </>
                        ) : (
                          <>
                            <Navigation size={12} aria-hidden="true" />
                            <span>Public hire driver</span>
                          </>
                        )}
                      </p>
                    </div>

                    <div className={styles.metaRow}>
                      {driver.vehicle ? (
                        <span className={styles.metaChip}>
                          <Car size={12} aria-hidden="true" />
                          <span>{driver.vehicle.name}</span>
                        </span>
                      ) : null}
                      {driver.trips_count > 0 ? (
                        <span className={styles.metaChip}>
                          {driver.trips_count} {driver.trips_count === 1 ? "trip" : "trips"}
                        </span>
                      ) : (
                        <span className={styles.metaChip}>Available</span>
                      )}
                    </div>

                    <div className={styles.cardFooter}>
                      <Link href={bookHref} className={styles.bookLink}>
                        {bookLabel}
                        <ArrowRight size={14} aria-hidden="true" />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
