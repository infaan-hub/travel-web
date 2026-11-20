"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { publicPrivateHireAPI } from "@/lib/api/client";
import { PageHero } from "@/components/PageHero";
import {
  Car,
  UserCheck,
  Phone,
  Briefcase,
  Users,
  Eye,
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
    <div className={`page ${styles.page} ${styles.listingRoot}`}>
      {/* Page Hero — same pattern as /companies/ */}
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

      <div className={`${styles.content} ${cardStyles.transportFleet}`}>
        {/* Listing head — identical structure to /companies/ */}
        <div className={styles.listingHead}>
          <div>
            <span className={styles.listingKicker}>Transport directory</span>
            <h2 className={styles.listingTitle}>Private hire services</h2>
            <p className={styles.listingLead}>
              Browse verified private hire services. Each listing pairs a licensed vehicle with a professional in-house driver.
            </p>
          </div>
          <span className={styles.listingCount} aria-live="polite">
            {loading ? "Loading" : `${total} ${total === 1 ? "service" : "services"}`}
          </span>
        </div>

        {/* Grid — loading skeletons */}
        {loading ? (
          <div className={cardStyles.servicesGrid} aria-busy="true">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className={cardStyles.serviceCard} key={index}>
                <div className={cardStyles.serviceHeader}>
                  <div className={cardStyles.serviceTitleGroup}>
                    <div className="company-skeleton-line company-skeleton-line--title" />
                    <div className="company-skeleton-line company-skeleton-line--short" />
                  </div>
                </div>
                <div className={cardStyles.serviceBody}>
                  <div className="company-skeleton-line" />
                  <div className="company-skeleton-line company-skeleton-line--short" />
                </div>
              </div>
            ))}
          </div>
        ) : services.length === 0 ? (
          /* Empty state */
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
            {/* Service Cards Grid — card style from commit 16886eb */}
            <div className={cardStyles.servicesGrid}>
              {services.map((svc) => {
                const vehicleName = svc.vehicle?.name ?? "Vehicle";
                const plateNumber = svc.vehicle?.plate_number ?? "";
                const driverName = svc.driver?.name ?? "Driver";
                const companyName = svc.company?.name ?? "";
                const capacityPax = svc.vehicle?.capacity ?? 0;
                const luggageBags = svc.vehicle?.luggage_capacity ?? 0;
                const vehicleDesc = svc.vehicle
                  ? `${svc.vehicle.name} (${svc.vehicle.category})`
                  : "";

                return (
                  <div key={svc.id} className={cardStyles.serviceCard}>
                    {/* Header */}
                    <div className={cardStyles.serviceHeader}>
                      <div className={cardStyles.serviceTitleGroup}>
                        <h3 className={cardStyles.cardVehicleTitle}>
                          {vehicleName}
                          {plateNumber && <span className={cardStyles.plateBadgeInline}>{plateNumber}</span>}
                        </h3>
                        {svc.title && <p className={cardStyles.tagline}>{svc.title}</p>}
                        {companyName && <span className={cardStyles.companyNameBadge}>{companyName}</span>}
                      </div>

                      <div className={cardStyles.priceTag}>
                        ${svc.price}
                        <span className={cardStyles.pricingUnit}>
                          /{PRICING_LABELS[svc.pricing_type] || svc.pricing_type}
                        </span>
                      </div>
                    </div>

                    {/* Body */}
                    <div className={cardStyles.serviceBody}>
                      {/* Specs line: 5 pax • 5 bags */}
                      <div className={cardStyles.specsLine}>
                        <Users size={15} color="#08428c" />
                        <span>{capacityPax} pax</span>
                        <span>•</span>
                        <Briefcase size={15} color="#08428c" />
                        <span>{luggageBags} bags</span>
                      </div>

                      {/* Vehicle and Driver info rows */}
                      <div className="flex flex-col gap-1.5 text-xs">
                        {vehicleDesc && (
                          <div className={cardStyles.vehicleDetailLine}>
                            <strong>Vehicle:</strong>
                            <span>{vehicleDesc}</span>
                          </div>
                        )}
                        <div className={cardStyles.driverDetailLine}>
                          <strong>Driver:</strong>
                          <span>{driverName}</span>
                        </div>
                      </div>

                      {/* Paired blocks: vehicle image + driver thumbnail */}
                      <div className={cardStyles.pairedBlock}>
                        <div className={cardStyles.subSectionCard}>
                          <div className={cardStyles.sectionHeaderRow}>
                            <Car size={13} /> Vehicle Photo
                          </div>
                          <div className={cardStyles.vehicleThumbArea}>
                            {svc.vehicle?.front_image_url ? (
                              <Image
                                src={svc.vehicle.front_image_url}
                                alt={vehicleName}
                                fill
                                className={cardStyles.thumbImg}
                                unoptimized
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center bg-slate-200">
                                <Car size={24} color="#64748b" />
                              </div>
                            )}
                            {plateNumber && <span className={cardStyles.plateMiniBadge}>{plateNumber}</span>}
                          </div>
                        </div>

                        <div className={cardStyles.subSectionCard}>
                          <div className={cardStyles.sectionHeaderRow}>
                            <UserCheck size={13} /> Assigned Driver
                          </div>
                          <div className={cardStyles.driverInfoArea}>
                            {svc.driver?.image_url ? (
                              <Image
                                src={svc.driver.image_url}
                                alt={driverName}
                                width={46}
                                height={46}
                                className={cardStyles.driverAvatarMini}
                                unoptimized
                              />
                            ) : (
                              <div className={cardStyles.driverAvatarFallback}>
                                {(driverName || "DR").slice(0, 2).toUpperCase()}
                              </div>
                            )}
                            <div className={cardStyles.driverDetailsMini}>
                              <span className={cardStyles.driverNameMini}>{driverName}</span>
                              {svc.driver?.phone && (
                                <span className={cardStyles.driverContactMini}>{svc.driver.phone}</span>
                              )}
                              <span className="text-[10px] font-semibold text-emerald-700">Verified Driver</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className={cardStyles.serviceFooter}>
                      <Link
                        href={`/transport/service/${svc.id}/`}
                        className={cardStyles.btnPreview}
                        style={{ textDecoration: "none" }}
                      >
                        <Eye size={14} /> View full details
                      </Link>

                      <div className="flex items-center gap-2">
                        <Link
                          href={`/booking/${svc.id}/`}
                          className={cardStyles.primaryBtn}
                          style={{ textDecoration: "none" }}
                        >
                          Book this trip
                        </Link>
                        {svc.company?.contact_phone && (
                          <a
                            href={`https://wa.me/${svc.company.contact_phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                              `Hi, I would like to book private hire service ${svc.title} (${vehicleName})`,
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className={cardStyles.btnSecondary}
                            title="Chat on WhatsApp"
                          >
                            <Phone size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
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
      </div>
    </div>
  );
}
