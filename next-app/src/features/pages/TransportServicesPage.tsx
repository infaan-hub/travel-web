"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { publicPrivateHireAPI } from "@/lib/api/client";
import { PageHero } from "@/components/PageHero";
import { getImageUrl } from "@/lib/utils/image-url";
import {
  ArrowRight,
  Briefcase,
  Car,
  Eye,
  Phone,
  ShieldCheck,
  Users,
} from "lucide-react";
import styles from "@/features/pages/company-public.module.css";
import cardStyles from "@/features/pages/company-private-service.module.css";
import {
  PRICING_LABELS,
  SAMPLE_PRIVATE_HIRE_SERVICES,
  type PrivateHireService,
} from "@/features/transport/private-hire-data";

const PAGE_SIZE = 12;

export default function TransportServicesPage() {
  const [services, setServices] = useState<PrivateHireService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const load = useCallback(async () => {
    try {
      const res = await publicPrivateHireAPI.getAll({
        search: search.trim() || undefined,
        page,
        page_size: PAGE_SIZE,
      });
      const data = res.data;
      const apiResults: PrivateHireService[] = Array.isArray(data) ? data : data?.results || [];
      const apiTotal: number = Array.isArray(data)
        ? data.length
        : data?.total ?? data?.count ?? apiResults.length;
      if (apiResults.length > 0) {
        setServices(apiResults);
        setTotal(apiTotal);
      } else {
        const query = search.trim().toLowerCase();
        const filtered = query
          ? SAMPLE_PRIVATE_HIRE_SERVICES.filter(
              (s) =>
                s.title.toLowerCase().includes(query) ||
                s.vehicle?.name.toLowerCase().includes(query) ||
                s.vehicle?.plate_number.toLowerCase().includes(query) ||
                s.driver?.name.toLowerCase().includes(query) ||
                s.company?.name.toLowerCase().includes(query),
            )
          : SAMPLE_PRIVATE_HIRE_SERVICES;
        setServices(filtered);
        setTotal(filtered.length);
      }
    } catch {
      const query = search.trim().toLowerCase();
      const filtered = query
        ? SAMPLE_PRIVATE_HIRE_SERVICES.filter(
            (s) =>
              s.title.toLowerCase().includes(query) ||
              s.vehicle?.name.toLowerCase().includes(query) ||
              s.vehicle?.plate_number.toLowerCase().includes(query) ||
              s.driver?.name.toLowerCase().includes(query) ||
              s.company?.name.toLowerCase().includes(query),
          )
        : SAMPLE_PRIVATE_HIRE_SERVICES;
      setServices(filtered);
      setTotal(filtered.length);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    // Fetching the directory whenever the search or page changes is the
    // external synchronization this effect exists for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(search.trim());

  return (
    <div className={`page ${styles.page} ${styles.listingRoot} ${cardStyles.featuredPageFlush}`}>
      <PageHero
        eyebrow="Private hire transport"
        title="Available private hire services"
        subtitle="Verified vehicles paired with professional drivers."
        backgroundImageKey="feature"
        patternImageKey="thumb"
      >
        <div className={styles.filters}>
          <input
            value={search}
            onChange={(e) => {
              setLoading(true);
              setPage(1);
              setSearch(e.target.value);
            }}
            placeholder="Search services..."
            aria-label="Search services"
          />
        </div>
      </PageHero>

      <section className={cardStyles.featuredShell} aria-label="Private hire services">
        <div className={cardStyles.featuredHead}>
          <div>
            <span className={styles.listingKicker}>Transport directory</span>
            <h2 className={styles.listingTitle}>Private hire services</h2>
          </div>
          <span className={styles.listingCount} aria-live="polite">
            {loading ? "Loading" : `${total} ${total === 1 ? "service" : "services"}`}
          </span>
        </div>

        {loading ? (
          <div className={cardStyles.featuredGrid} aria-busy="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className={cardStyles.featuredSkeleton} key={index} />
            ))}
          </div>
        ) : services.length === 0 ? (
          <div className={styles.empty}>
            <span className={styles.emptyIcon}>
              <Car size={28} />
            </span>
            <h2>{hasFilters ? "No services match your search" : "No services listed yet"}</h2>
            <p>
              {hasFilters
                ? "Try clearing the search to see all available private hire services."
                : "Verified private hire service listings will appear here when providers publish them."}
            </p>
            {hasFilters && (
              <button
                className="btn btn-secondary"
                type="button"
                onClick={() => {
                  setLoading(true);
                  setSearch("");
                  setPage(1);
                }}
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <>
            <div className={cardStyles.featuredGrid}>
              {services.map((svc) => {
                const vehicleName = svc.vehicle?.name ?? "Vehicle";
                const plateNumber = svc.vehicle?.plate_number ?? "";
                const category = svc.vehicle?.category || "Private Hire";
                const driverName = svc.driver?.name ?? "Verified Driver";
                const companyName = svc.company?.name ?? "";
                const capacityPax = svc.vehicle?.capacity ?? 0;
                const luggageBags = svc.vehicle?.luggage_capacity ?? 0;
                const pricingUnit = PRICING_LABELS[svc.pricing_type] || svc.pricing_type || "per trip";
                const bgImage = svc.vehicle?.front_image_url
                  ? getImageUrl(svc.vehicle.front_image_url)
                  : null;
                const driverImage = svc.driver?.image_url
                  ? getImageUrl(svc.driver.image_url)
                  : null;

                return (
                  <article key={svc.id} className={cardStyles.featuredCard}>
                    {/* Full-bleed background image */}
                    <div className={cardStyles.featuredBgMedia}>
                      {bgImage ? (
                        <Image
                          src={bgImage}
                          alt={vehicleName}
                          fill
                          sizes="(max-width: 820px) 92vw, (max-width: 1220px) 46vw, 31vw"
                          className={cardStyles.featuredBgImg}
                          unoptimized
                        />
                      ) : (
                        <div className={cardStyles.featuredBgFallback}>
                          <Car size={54} aria-hidden="true" />
                        </div>
                      )}
                    </div>
                    <span className={cardStyles.featuredTopScrim} aria-hidden="true" />

                    {/* Top frosted bar */}
                    <div className={cardStyles.featuredTopBar}>
                      <div className={cardStyles.featuredTopLeft}>
                        <span className={cardStyles.featuredGlassBadge}>
                          <ShieldCheck size={12} aria-hidden="true" />
                          {category}
                        </span>
                        {plateNumber ? (
                          <span className={cardStyles.featuredPlatePill}>{plateNumber}</span>
                        ) : null}
                      </div>

                      <div className={cardStyles.featuredPricePill}>
                        <span className={cardStyles.featuredPriceNum}>${svc.price}</span>
                        <span className={cardStyles.featuredPriceUnit}>/{pricingUnit}</span>
                      </div>
                    </div>

                    {/* Bottom gradient sheet with transport details */}
                    <div className={cardStyles.featuredSheet}>
                      <div className={cardStyles.featuredHeadingGroup}>
                        {companyName ? (
                          <span className={cardStyles.featuredCompanyEyebrow}>{companyName}</span>
                        ) : null}
                        <h3 className={cardStyles.featuredTitle}>{vehicleName}</h3>
                        {svc.title ? (
                          <p className={cardStyles.featuredSubtitle}>{svc.title}</p>
                        ) : null}
                      </div>

                      <div className={cardStyles.featuredDetailsStrip}>
                        <span className={cardStyles.featuredSpecChip}>
                          <Users size={13} aria-hidden="true" />
                          {capacityPax} pax
                        </span>
                        <span className={cardStyles.featuredSpecChip}>
                          <Briefcase size={13} aria-hidden="true" />
                          {luggageBags} bags
                        </span>
                        <span className={cardStyles.featuredDriverPill}>
                          {driverImage ? (
                            <Image
                              src={driverImage}
                              alt={driverName}
                              width={22}
                              height={22}
                              className={cardStyles.featuredDriverAvatar}
                              unoptimized
                            />
                          ) : (
                            <span className={cardStyles.featuredDriverInitials} aria-hidden="true">
                              {(driverName || "DR").slice(0, 2).toUpperCase()}
                            </span>
                          )}
                          <span className={cardStyles.featuredDriverName}>{driverName}</span>
                        </span>
                      </div>

                      <div className={cardStyles.featuredActions}>
                        <Link
                          href={`/transport/service/${svc.id}/`}
                          className={cardStyles.featuredBtnGlass}
                        >
                          <Eye size={14} aria-hidden="true" />
                          Details
                        </Link>
                        <Link
                          href={`/booking/${svc.id}/`}
                          className={cardStyles.featuredBtnPrimary}
                        >
                          Book now
                          <ArrowRight size={14} aria-hidden="true" />
                        </Link>
                        {svc.company?.contact_phone ? (
                          <a
                            href={`https://wa.me/${svc.company.contact_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Hi, I would like to book private hire service ${svc.title} (${vehicleName})`,
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className={cardStyles.featuredBtnIcon}
                            title="Chat on WhatsApp"
                            aria-label={`Chat with ${companyName || "provider"} on WhatsApp`}
                          >
                            <Phone size={15} aria-hidden="true" />
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>

            {totalPages > 1 && (
              <div className={styles.pagination}>
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => {
                    setLoading(true);
                    setPage((p) => Math.max(1, p - 1));
                  }}
                >
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => {
                    setLoading(true);
                    setPage((p) => Math.min(totalPages, p + 1));
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
