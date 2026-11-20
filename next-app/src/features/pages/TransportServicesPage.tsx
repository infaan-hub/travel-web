"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { publicPrivateHireAPI, transportBookingsAPI } from "@/lib/api/client";
import { useToast } from "@/components/ToastProvider";
import { PageHero } from "@/components/PageHero";
import {
  Car,
  UserCheck,
  Phone,
  Briefcase,
  Users,
  Eye,
  X,
  Loader,
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
  const toast = useToast();
  const [services, setServices] = useState<PrivateHireService[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  // Booking states
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingService, setBookingService] = useState<PrivateHireService | null>(null);
  const [bookingForm, setBookingForm] = useState({
    full_name: "",
    email: "",
    phone: "",
    passengers: "1",
    travel_date: "",
    end_date: "",
    pickup_time: "",
    notes: "",
    origin: "",
    destination: "",
  });
  const [bookingSubmitting, setBookingSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
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
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = Boolean(search.trim());

  const openBooking = (svc: PrivateHireService) => {
    setBookingService(svc);
    setBookingForm({
        full_name: "",
      email: "",
      phone: "",
      passengers: String(svc.vehicle?.capacity || 1),
      travel_date: "",
      end_date: "",
      pickup_time: "",
      notes: "",
      origin: "",
      destination: "",
    });
    setBookingOpen(true);
  };

  const handleBookingSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!bookingService) return;
    try {
      setBookingSubmitting(true);
      await transportBookingsAPI.create({
        service_id: bookingService.id,
        ...bookingForm,
      });
      toast.success("Booking request submitted! The transport company will confirm shortly.");
      setBookingOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit booking";
      toast.error(msg);
    } finally {
      setBookingSubmitting(false);
    }
  };

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
                        <button
                          type="button"
                          className={cardStyles.primaryBtn}
                          onClick={() => openBooking(svc)}
                        >
                          Book now
                        </button>
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
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </button>
                <span>
                  Page {page} of {totalPages}
                </span>
                <button
                  type="button"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>


      {/* ── Booking Form Modal ── */}
      {bookingOpen && bookingService && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 60,
            background: "rgba(8,34,58,0.72)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "16px",
          }}
          onClick={() => setBookingOpen(false)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "20px",
              width: "min(100%,560px)",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 24px 64px rgba(8,66,140,0.22)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Booking header */}
            <div
              style={{
                background: "linear-gradient(145deg,#08428c,#063a78)",
                borderRadius: "20px 20px 0 0",
                padding: "18px 22px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                color: "#fff",
                gap: "12px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "1.08rem", fontWeight: 700 }}>
                Book {bookingService.title}
              </h2>
              <button
                type="button"
                onClick={() => setBookingOpen(false)}
                style={{ width: "32px", height: "32px", borderRadius: "8px", background: "rgba(255,255,255,0.14)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit}>
              <div style={{ padding: "18px 22px", display: "flex", flexDirection: "column", gap: "14px" }}>
                {/* Service summary */}
                <div style={{ padding: "12px", background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "12px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.82rem" }}>
                  <div>
                    <strong style={{ display: "block", color: "#0f172a" }}>{bookingService.vehicle?.name ?? bookingService.title}</strong>
                    <span style={{ color: "#64748b" }}>
                      Plate: {bookingService.vehicle?.plate_number} &bull; Driver: {bookingService.driver?.name}
                    </span>
                  </div>
                  <span style={{ fontWeight: 800, fontSize: "0.9rem", color: "#08428c" }}>
                    ${bookingService.price} / {PRICING_LABELS[bookingService.pricing_type] ?? bookingService.pricing_type}
                  </span>
                </div>

                {/* Form grid */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                  {[
                    { label: "Your Full Name *", type: "text", key: "full_name", placeholder: "e.g. John Smith", required: true },
                    { label: "Email Address *", type: "email", key: "email", placeholder: "john@example.com", required: true },
                    { label: "Phone (WhatsApp) *", type: "tel", key: "phone", placeholder: "+255 777 000 111", required: true },
                    { label: "Passengers", type: "number", key: "passengers", placeholder: "1", required: true },
                    { label: "Travel / Pickup Date *", type: "date", key: "travel_date", placeholder: "", required: true },
                    { label: "Pickup Time", type: "time", key: "pickup_time", placeholder: "", required: false },
                    { label: "Origin (Pickup Location) *", type: "text", key: "origin", placeholder: "e.g. ZNZ Airport", required: true },
                    { label: "Destination (Drop-off) *", type: "text", key: "destination", placeholder: "e.g. Kendwa Rocks Resort", required: true },                  ].map(({ label, type, key, placeholder, required }) => (
                    <div key={key} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                      <label style={{ fontSize: "0.76rem", fontWeight: 700, color: "#334155" }}>{label}</label>
                      <input
                        required={required}
                        type={type}
                        placeholder={placeholder}
                        value={bookingForm[key as keyof typeof bookingForm]}
                        onChange={(e) => setBookingForm({ ...bookingForm, [key]: e.target.value })}
                        style={{ minHeight: "40px", padding: "0 10px", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "0.84rem", color: "#0f172a", background: "#fafafa", outline: "none" }}
                        {...(type === "number" ? { min: 1, max: bookingService.vehicle?.capacity ?? 10 } : {})}
                      />
                    </div>
                  ))}
                </div>

                {/* Notes */}
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <label style={{ fontSize: "0.76rem", fontWeight: 700, color: "#334155" }}>Pickup &amp; Drop-off / Flight Notes</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Flight QR 1487 arriving ZNZ at 14:20. Drop-off at Kendwa Rocks Resort."
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                    style={{ padding: "10px 12px", border: "1px solid #e2e8f0", borderRadius: "10px", fontSize: "0.84rem", color: "#0f172a", background: "#fafafa", resize: "vertical", outline: "none" }}
                  />
                </div>
              </div>

              {/* Booking footer */}
              <div style={{ padding: "14px 22px 20px", display: "flex", gap: "10px", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9" }}>
                <button
                  type="button"
                  onClick={() => setBookingOpen(false)}
                  style={{ minHeight: "44px", padding: "0 18px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#334155", fontWeight: 700, cursor: "pointer", fontSize: "0.84rem" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  style={{ minHeight: "44px", padding: "0 20px", borderRadius: "12px", background: "linear-gradient(145deg,#08428c,#063a78)", color: "#fff", fontWeight: 800, cursor: bookingSubmitting ? "not-allowed" : "pointer", fontSize: "0.84rem", border: "none", display: "flex", alignItems: "center", gap: "8px", opacity: bookingSubmitting ? 0.7 : 1 }}
                >
                  {bookingSubmitting ? (
                    <>
                      <Loader size={15} style={{ animation: "spin 1s linear infinite" }} /> Submitting...
                    </>
                  ) : (
                    "Confirm Booking Request"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
