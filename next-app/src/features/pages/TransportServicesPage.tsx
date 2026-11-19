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
  Mail,
  Briefcase,
  Users,
  Eye,
  X,
  Loader,
  CheckCircle,
  Calendar,
  Clock,
  Sparkles,
} from "lucide-react";
import styles from "@/features/pages/company-public.module.css";
import cardStyles from "@/features/pages/company-private-service.module.css";

type Vehicle = {
  id: number;
  name: string;
  plate_number: string;
  category: string;
  capacity: number;
  luggage_capacity: number;
  description: string;
  includes: string[];
  excludes: string[];
  front_image_url: string | null;
  side_image_url: string | null;
  back_image_url: string | null;
};

type Driver = {
  id: number;
  name: string;
  phone: string;
  email: string;
  image_url: string | null;
  license_number: string;
  id_number: string;
};

type Service = {
  id: number;
  title: string;
  description: string;
  price: string;
  pricing_type: string;
  vehicle: Vehicle | null;
  driver: Driver | null;
  company: {
    id: number;
    name: string;
    slug: string;
    contact_phone: string;
    contact_email: string;
    logo_image_url: string | null;
  } | null;
};

const PRICING_LABELS: Record<string, string> = {
  per_trip: "per trip",
  per_day: "per day",
  per_hour: "per hour",
};

const SAMPLE_SERVICES: Service[] = [
  {
    id: 101,
    title: "First class private hire travel service",
    description:
      "First class private hire travel service across Zanzibar with luxury air-conditioned vehicle, complimentary mineral water, luggage assistance, and meet & greet at airport or hotel.",
    price: "90",
    pricing_type: "per_trip",
    vehicle: {
      id: 201,
      name: "Toyota Alphard",
      plate_number: "Z454AAD",
      category: "Minivan",
      capacity: 5,
      luggage_capacity: 5,
      description: "Executive 5-seater luxury minivan with leather seating, climate control, and privacy glass.",
      includes: [
        "Fuel & Highway Tolls",
        "Air Conditioning",
        "Bottled Mineral Water",
        "Flight Delay Tracking",
        "Luggage Assistance",
      ],
      excludes: ["Driver Gratuity", "National Park Entry Fees"],
      front_image_url:
        "https://images.unsplash.com/photo-1549317661-bd32c8ce0db2?auto=format&fit=crop&w=800&q=80",
      side_image_url:
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
      back_image_url: null,
    },
    driver: {
      id: 301,
      name: "hameed abdul",
      phone: "+255 777 454 000",
      email: "hameed.driver@infaan.com",
      image_url: null,
      license_number: "DL-ZN-45401",
      id_number: "19880412-32100-00002-19",
    },
    company: {
      id: 401,
      name: "infaan private hire ltd",
      slug: "infaan-private-hire-ltd",
      contact_phone: "+255777454000",
      contact_email: "support@infaan.com",
      logo_image_url: null,
    },
  },
  {
    id: 102,
    title: "Executive VIP Island Transfer",
    description:
      "Comfortable chauffeured transfers between Abeid Amani Karume International Airport (ZNZ), Stone Town, and coastal beach resorts.",
    price: "85",
    pricing_type: "per_trip",
    vehicle: {
      id: 202,
      name: "Toyota Alphard Executive",
      plate_number: "Z942AB",
      category: "Minivan",
      capacity: 5,
      luggage_capacity: 5,
      description: "VIP private hire passenger transport vehicle.",
      includes: ["Air Conditioning", "Airport Meet & Greet", "Cold Towels & Water", "Luggage Porterage"],
      excludes: ["Driver Tip"],
      front_image_url:
        "https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=800&q=80",
      side_image_url: null,
      back_image_url: null,
    },
    driver: {
      id: 302,
      name: "Rashid Salim",
      phone: "+255 778 123 789",
      email: "rashid.driver@infaan.com",
      license_number: "DL-ZN-98214",
      id_number: "19910515-32100-00004-22",
      image_url: null,
    },
    company: {
      id: 401,
      name: "infaan private hire ltd",
      slug: "infaan-private-hire-ltd",
      contact_phone: "+255777454000",
      contact_email: "support@infaan.com",
      logo_image_url: null,
    },
  },
];

const PAGE_SIZE = 12;

export default function TransportServicesPage() {
  const toast = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const [selected, setSelected] = useState<Service | null>(null);

  // Booking states
  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingService, setBookingService] = useState<Service | null>(null);
  const [bookingForm, setBookingForm] = useState({
    booking_type: "transport",
    full_name: "",
    email: "",
    phone: "",
    passengers: "1",
    travel_date: "",
    end_date: "",
    pickup_time: "",
    notes: "",
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
      const apiResults: Service[] = Array.isArray(data) ? data : data?.results || [];
      const apiTotal: number = Array.isArray(data)
        ? data.length
        : data?.total ?? data?.count ?? apiResults.length;
      if (apiResults.length > 0) {
        setServices(apiResults);
        setTotal(apiTotal);
      } else {
        const query = search.trim().toLowerCase();
        const filtered = query
          ? SAMPLE_SERVICES.filter(
              (s) =>
                s.title.toLowerCase().includes(query) ||
                s.vehicle?.name.toLowerCase().includes(query) ||
                s.vehicle?.plate_number.toLowerCase().includes(query) ||
                s.driver?.name.toLowerCase().includes(query) ||
                s.company?.name.toLowerCase().includes(query),
            )
          : SAMPLE_SERVICES;
        setServices(filtered);
        setTotal(filtered.length);
      }
    } catch {
      const query = search.trim().toLowerCase();
      const filtered = query
        ? SAMPLE_SERVICES.filter(
            (s) =>
              s.title.toLowerCase().includes(query) ||
              s.vehicle?.name.toLowerCase().includes(query) ||
              s.vehicle?.plate_number.toLowerCase().includes(query) ||
              s.driver?.name.toLowerCase().includes(query) ||
              s.company?.name.toLowerCase().includes(query),
          )
        : SAMPLE_SERVICES;
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

  const openBooking = (svc: Service) => {
    setBookingService(svc);
    setBookingForm({
      booking_type: "transport",
      full_name: "",
      email: "",
      phone: "",
      passengers: String(svc.vehicle?.capacity || 1),
      travel_date: "",
      end_date: "",
      pickup_time: "",
      notes: "",
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
                      <button
                        type="button"
                        className={cardStyles.btnPreview}
                        onClick={() => setSelected(svc)}
                      >
                        <Eye size={14} /> View full details
                      </button>

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

      {/* ── View Full Details Modal ── */}
      {selected && (
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
          onClick={() => setSelected(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: "20px",
              width: "min(100%,720px)",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 24px 64px rgba(8,66,140,0.22)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal header */}
            <div
              style={{
                background: "linear-gradient(145deg,#08428c,#063a78)",
                borderRadius: "20px 20px 0 0",
                padding: "20px 24px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: "12px",
                color: "#fff",
              }}
            >
              <div>
                <span style={{ fontSize: "0.68rem", fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(255,255,255,0.72)" }}>
                  Tourist Booking View
                </span>
                <h2 style={{ margin: "4px 0 2px", fontSize: "1.22rem", fontWeight: 700 }}>{selected.title}</h2>
                <span style={{ fontSize: "0.78rem", opacity: 0.78 }}>{selected.company?.name ?? ""}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span
                  style={{
                    background: "rgba(255,255,255,0.18)",
                    border: "1px solid rgba(255,255,255,0.4)",
                    borderRadius: "10px",
                    padding: "4px 14px",
                    fontWeight: 800,
                    fontSize: "1rem",
                  }}
                >
                  ${selected.price}
                  <span style={{ fontWeight: 400, fontSize: "0.72rem", opacity: 0.82 }}>
                    {" "}/ {PRICING_LABELS[selected.pricing_type] ?? selected.pricing_type}
                  </span>
                </span>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  style={{
                    width: "32px",
                    height: "32px",
                    borderRadius: "8px",
                    background: "rgba(255,255,255,0.14)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Modal body */}
            <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "18px" }}>

              {/* Vehicle section */}
              {selected.vehicle && (
                <div style={{ border: "1px solid #e2e8f0", borderRadius: "14px", padding: "16px", display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "8px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <Car size={18} color="#08428c" />
                      <strong style={{ fontSize: "1rem", color: "#0f172a" }}>{selected.vehicle.name}</strong>
                    </div>
                    <span style={{ fontFamily: "monospace", fontWeight: 800, fontSize: "0.72rem", background: "#0f172a", color: "#fff", padding: "2px 10px", borderRadius: "5px" }}>
                      Plate: {selected.vehicle.plate_number}
                    </span>
                  </div>

                  {/* Vehicle photos */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(140px,1fr))", gap: "10px" }}>
                    {[
                      { label: "Front View (Main)", url: selected.vehicle.front_image_url },
                      { label: "Side View", url: selected.vehicle.side_image_url },
                      { label: "Back View", url: selected.vehicle.back_image_url },
                    ].map(({ label, url }) => (
                      <div key={label} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                        <span style={{ fontSize: "0.68rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>{label}</span>
                        <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: "10px", overflow: "hidden", background: "#f1f5f9" }}>
                          {url ? (
                            <Image src={url} alt={label} fill className="object-cover" unoptimized />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "0.72rem", color: "#94a3b8" }}>None</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Capacity */}
                  <div style={{ display: "flex", gap: "16px", fontSize: "0.82rem", color: "#475569", paddingTop: "10px", borderTop: "1px solid #f1f5f9" }}>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px" }}><Users size={14} color="#08428c" /> {selected.vehicle.capacity} Passengers</span>
                    <span style={{ display: "flex", alignItems: "center", gap: "5px" }}><Briefcase size={14} color="#08428c" /> {selected.vehicle.luggage_capacity} Luggage Bags</span>
                    <span><strong>Category:</strong> {selected.vehicle.category}</span>
                  </div>

                  {/* Included / Excluded */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                    <div>
                      <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>
                        What&apos;s Included
                      </span>
                      <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "0.8rem", color: "#334155", lineHeight: 1.7 }}>
                        {(selected.vehicle.includes || []).map((inc, i) => (
                          <li key={i}>{inc}</li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <span style={{ fontSize: "0.68rem", fontWeight: 800, color: "#dc2626", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: "6px" }}>
                        What&apos;s Excluded
                      </span>
                      <ul style={{ margin: 0, paddingLeft: "16px", fontSize: "0.8rem", color: "#334155", lineHeight: 1.7 }}>
                        {(selected.vehicle.excludes || []).map((exc, i) => (
                          <li key={i}>{exc}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Driver section */}
              {selected.driver && (
                <div style={{ border: "1px solid #e0f2fe", borderRadius: "14px", padding: "16px", background: "rgba(224,242,254,0.25)", display: "flex", flexDirection: "column", gap: "12px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <UserCheck size={18} color="#08428c" />
                    <strong style={{ fontSize: "1rem", color: "#0f172a" }}>Assigned Private Hire Driver</strong>
                  </div>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "16px", flexWrap: "wrap" }}>
                    {selected.driver.image_url ? (
                      <Image
                        src={selected.driver.image_url}
                        alt={selected.driver.name}
                        width={72}
                        height={72}
                        style={{ borderRadius: "50%", objectFit: "cover", border: "2px solid #38bdf8" }}
                        unoptimized
                      />
                    ) : (
                      <div style={{ width: 72, height: 72, borderRadius: "50%", background: "#bae6fd", color: "#0369a1", fontSize: "1.5rem", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {selected.driver.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div style={{ display: "flex", flexDirection: "column", gap: "5px", flex: 1 }}>
                      <strong style={{ fontSize: "0.98rem", color: "#0f172a" }}>{selected.driver.name}</strong>
                      <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.8rem", color: "#475569" }}>
                        <Phone size={13} color="#08428c" /> {selected.driver.phone}
                      </span>
                      {selected.driver.email && (
                        <span style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "0.8rem", color: "#475569" }}>
                          <Mail size={13} color="#08428c" /> {selected.driver.email}
                        </span>
                      )}
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "4px" }}>
                        <span style={{ fontSize: "0.72rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "2px 8px", color: "#334155" }}>
                          License: <strong>{selected.driver.license_number}</strong>
                        </span>
                        <span style={{ fontSize: "0.72rem", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "6px", padding: "2px 8px", color: "#334155" }}>
                          ID: <strong>{selected.driver.id_number}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div style={{ padding: "16px 24px 20px", display: "flex", gap: "10px", justifyContent: "flex-end", borderTop: "1px solid #f1f5f9" }}>
              <button
                type="button"
                onClick={() => setSelected(null)}
                style={{ minHeight: "44px", padding: "0 18px", borderRadius: "12px", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#334155", fontWeight: 700, cursor: "pointer", fontSize: "0.84rem" }}
              >
                Close Details
              </button>
              <button
                type="button"
                onClick={() => {
                  const s = selected;
                  setSelected(null);
                  openBooking(s);
                }}
                style={{ minHeight: "44px", padding: "0 20px", borderRadius: "12px", background: "linear-gradient(145deg,#08428c,#063a78)", color: "#fff", fontWeight: 800, cursor: "pointer", fontSize: "0.84rem", border: "none" }}
              >
                Book This Service
              </button>
            </div>
          </div>
        </div>
      )}

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
                  ].map(({ label, type, key, placeholder, required }) => (
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
