"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { publicPrivateHireAPI, transportBookingsAPI } from "@/lib/api/client";
import { useToast } from "@/components/ToastProvider";
import {
  Car,
  UserCheck,
  Phone,
  Mail,
  Briefcase,
  Users,
  Search,
  Eye,
  X,
  Loader,
  ShieldCheck,
  CheckCircle,
  Calendar,
  Clock,
  Sparkles,
} from "lucide-react";
import styles from "./company-private-service.module.css";

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

export default function TransportServicesPage() {
  const toast = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
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
      const res = await publicPrivateHireAPI.getAll({ search: search.trim() || undefined });
      const apiResults: Service[] = res.data?.results || [];
      if (apiResults.length > 0) {
        setServices(apiResults);
      } else {
        const query = search.trim().toLowerCase();
        if (query) {
          const filtered = SAMPLE_SERVICES.filter(
            (s) =>
              s.title.toLowerCase().includes(query) ||
              s.vehicle?.name.toLowerCase().includes(query) ||
              s.vehicle?.plate_number.toLowerCase().includes(query) ||
              s.driver?.name.toLowerCase().includes(query) ||
              s.company?.name.toLowerCase().includes(query),
          );
          setServices(filtered);
        } else {
          setServices(SAMPLE_SERVICES);
        }
      }
    } catch {
      const query = search.trim().toLowerCase();
      if (query) {
        const filtered = SAMPLE_SERVICES.filter(
          (s) =>
            s.title.toLowerCase().includes(query) ||
            s.vehicle?.name.toLowerCase().includes(query) ||
            s.vehicle?.plate_number.toLowerCase().includes(query) ||
            s.driver?.name.toLowerCase().includes(query) ||
            s.company?.name.toLowerCase().includes(query),
        );
        setServices(filtered);
      } else {
        setServices(SAMPLE_SERVICES);
      }
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    void load();
  }, [load]);

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
    <div className={styles.root}>
      {/* Top Header */}
      <div className={styles.topBar}>
        <div className={styles.titleArea}>
          <div className={styles.breadcrumb}>
            <Link href="/">Home</Link>
            <span>/</span>
            <span>Private Hire Transport</span>
          </div>
          <span className={styles.eyebrow}>Verified Fleet Platform</span>
          <h1>
            <Car size={32} /> Available private hire services
          </h1>
          <p>Verified vehicles paired with professional drivers.</p>
        </div>

        <div className={styles.actionsArea}>
          <div className={styles.searchBox}>
            <Search size={16} color="#64748b" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services..."
            />
          </div>
        </div>
      </div>

      {/* Overview Block */}
      <section className={styles.overview}>
        <div className={styles.overviewMain}>
          <div className={styles.overviewHeading}>
            <div className={styles.overviewIcon}>
              <ShieldCheck size={26} />
            </div>
            <div>
              <h2>Safe & verified island transport</h2>
              <p>
                Every private hire service pairs a registered, roadworthy vehicle with a verified in-house chauffeur.
                Review complete vehicle specs and driver licensing before reserving.
              </p>
            </div>
          </div>

          <ul className={styles.stats}>
            <li>
              <span>Available Services</span>
              <strong>{services.length}</strong>
              <small>Verified listings online</small>
            </li>
            <li>
              <span>Licensed Fleet</span>
              <strong>100%</strong>
              <small>Plate & document vetted</small>
            </li>
            <li>
              <span>Drivers</span>
              <strong>Professional</strong>
              <small>ZanID, NIDA & License on file</small>
            </li>
          </ul>
        </div>

        <div className={styles.overviewAside}>
          <span>Need Custom Booking?</span>
          <strong>Airport & VIP</strong>
          <p>Book airport meet & greet with your flight details or charter daily chauffeured transport.</p>
          <Link href="/contact/" className={styles.primaryBtn}>
            Partner Registration & Help
          </Link>
        </div>
      </section>

      {/* Service Cards Grid */}
      {loading ? (
        <div className={styles.emptyState}>
          <Loader className="animate-spin" size={32} color="#08428c" />
          <div className={styles.emptyStateSub}>Loading available private hire services...</div>
        </div>
      ) : services.length === 0 ? (
        <div className={styles.emptyState}>
          <Car size={48} color="#94a3b8" />
          <div className={styles.emptyStateTitle}>No Private Hire Services Found</div>
          <div className={styles.emptyStateSub}>
            No services matched your search &quot;{search}&quot;. Try clearing the search filter or view all available
            services.
          </div>
          <button type="button" className={styles.primaryBtn} onClick={() => setSearch("")}>
            Reset search
          </button>
        </div>
      ) : (
        <div className={styles.servicesGrid}>
          {services.map((svc) => {
            const vehicleName = svc.vehicle?.name || "Toyota Alphard";
            const plateNumber = svc.vehicle?.plate_number || "Z454AAD";
            const tagline = svc.title || "First class private hire travel service";
            const companyName = svc.company?.name || "infaan private hire ltd";
            const capacityPax = svc.vehicle?.capacity ?? 5;
            const luggageBags = svc.vehicle?.luggage_capacity ?? 5;
            const vehicleDesc = svc.vehicle
              ? `${svc.vehicle.name} (${svc.vehicle.category})`
              : "Toyota Alphard (Minivan)";
            const driverName = svc.driver?.name ?? "hameed abdul";

            return (
              <div key={svc.id} className={styles.serviceCard}>
                {/* Header */}
                <div className={styles.serviceHeader}>
                  <div className={styles.serviceTitleGroup}>
                    <h3 className={styles.cardVehicleTitle}>
                      {vehicleName}
                      {plateNumber && (
                        <span className={styles.plateBadgeInline}>{plateNumber}</span>
                      )}
                    </h3>
                    <p className={styles.tagline}>{tagline}</p>
                    <span className={styles.companyNameBadge}>{companyName}</span>
                  </div>

                  <div className={styles.priceTag}>
                    ${svc.price}
                    <span className={styles.pricingUnit}>
                      /{PRICING_LABELS[svc.pricing_type] || svc.pricing_type}
                    </span>
                  </div>
                </div>

                {/* Body */}
                <div className={styles.serviceBody}>
                  {/* Specs line: 5 pax • 5 bags */}
                  <div className={styles.specsLine}>
                    <Users size={15} color="#08428c" />
                    <span>{capacityPax} pax</span>
                    <span>•</span>
                    <Briefcase size={15} color="#08428c" />
                    <span>{luggageBags} bags</span>
                  </div>

                  {/* Vehicle and Driver info rows */}
                  <div className="flex flex-col gap-1.5 text-xs">
                    <div className={styles.vehicleDetailLine}>
                      <strong>Vehicle:</strong>
                      <span>{vehicleDesc}</span>
                    </div>
                    <div className={styles.driverDetailLine}>
                      <strong>Driver:</strong>
                      <span>{driverName}</span>
                    </div>
                  </div>

                  {/* Paired blocks: vehicle image + driver thumbnail */}
                  <div className={styles.pairedBlock}>
                    <div className={styles.subSectionCard}>
                      <div className={styles.sectionHeaderRow}>
                        <Car size={13} /> Vehicle Photo
                      </div>
                      <div className={styles.vehicleThumbArea}>
                        {svc.vehicle?.front_image_url ? (
                          <Image
                            src={svc.vehicle.front_image_url}
                            alt={svc.vehicle.name}
                            fill
                            className={styles.thumbImg}
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-slate-200">
                            <Car size={24} color="#64748b" />
                          </div>
                        )}
                        {plateNumber && (
                          <span className={styles.plateMiniBadge}>{plateNumber}</span>
                        )}
                      </div>
                    </div>

                    <div className={styles.subSectionCard}>
                      <div className={styles.sectionHeaderRow}>
                        <UserCheck size={13} /> Assigned Driver
                      </div>
                      <div className={styles.driverInfoArea}>
                        {svc.driver?.image_url ? (
                          <Image
                            src={svc.driver.image_url}
                            alt={svc.driver.name}
                            width={46}
                            height={46}
                            className={styles.driverAvatarMini}
                            unoptimized
                          />
                        ) : (
                          <div className={styles.driverAvatarFallback}>
                            {(driverName || "DR").slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className={styles.driverDetailsMini}>
                          <span className={styles.driverNameMini}>{driverName}</span>
                          <span className={styles.driverContactMini}>
                            {svc.driver?.phone || "+255 777 454 000"}
                          </span>
                          <span className="text-[10px] font-semibold text-emerald-700">Verified Driver</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className={styles.serviceFooter}>
                  <button
                    type="button"
                    className={styles.btnPreview}
                    onClick={() => setSelected(svc)}
                  >
                    <Eye size={14} /> View full details
                  </button>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className={styles.primaryBtn}
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
                        className={styles.btnSecondary}
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
      )}

      {/* View Full Details Modal */}
      {selected && (
        <div className={styles.modalBackdrop} onClick={() => setSelected(null)}>
          <div className={styles.previewContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.previewHeader}>
              <div>
                <span className="text-xs uppercase tracking-wider text-teal-200 font-semibold">
                  Tourist Booking View
                </span>
                <h2 className={styles.previewHeaderTitle}>{selected.title}</h2>
                <span className="text-xs text-white/80">{selected.company?.name || "infaan private hire ltd"}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className={styles.previewPriceBadge}>
                  ${selected.price}
                  <span className="text-xs font-normal opacity-85">
                    /{PRICING_LABELS[selected.pricing_type] || selected.pricing_type}
                  </span>
                </span>
                <button
                  type="button"
                  className="text-white hover:opacity-75 p-1"
                  onClick={() => setSelected(null)}
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className={styles.previewBody}>
              <div className={styles.touristCallout}>
                <ShieldCheck size={20} />
                <span>
                  <strong>Full Verified Transport Information:</strong> Tourists booking this Private Hire Service see
                  complete verified details of both the vehicle and assigned driver below.
                </span>
              </div>

              {/* Vehicle Full Details */}
              {selected.vehicle && (
                <div className="border border-slate-200 rounded-xl p-4 bg-slate-50 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Car size={18} color="#08428c" />
                      <strong className="text-base text-slate-900">{selected.vehicle.name}</strong>
                    </div>
                    <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2.5 py-1 rounded">
                      Plate: {selected.vehicle.plate_number}
                    </span>
                  </div>

                  {/* Vehicle Gallery */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-slate-600">Front View (Main)</span>
                      <div className="relative w-full h-32 rounded-lg overflow-hidden bg-slate-200">
                        {selected.vehicle.front_image_url ? (
                          <Image
                            src={selected.vehicle.front_image_url}
                            alt="Front View"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-400">No Image</div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-slate-600">Side View</span>
                      <div className="relative w-full h-32 rounded-lg overflow-hidden bg-slate-200">
                        {selected.vehicle.side_image_url ? (
                          <Image
                            src={selected.vehicle.side_image_url}
                            alt="Side View"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                            Optional (None)
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-slate-600">Back View</span>
                      <div className="relative w-full h-32 rounded-lg overflow-hidden bg-slate-200">
                        {selected.vehicle.back_image_url ? (
                          <Image
                            src={selected.vehicle.back_image_url}
                            alt="Back View"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                            Optional (None)
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Vehicle Capacity & Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-xs font-semibold text-slate-700 block mb-1">Capacity</span>
                      <div className="flex gap-4 text-xs text-slate-600">
                        <span>👥 {selected.vehicle.capacity} Passengers</span>
                        <span>🧳 {selected.vehicle.luggage_capacity} Luggage Bags</span>
                      </div>
                    </div>

                    <div>
                      <span className="text-xs font-semibold text-slate-700 block mb-1">Vehicle Category</span>
                      <span className="text-xs text-slate-800 font-medium">{selected.vehicle.category}</span>
                    </div>
                  </div>

                  {/* Included / Excluded */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    <div>
                      <span className="text-xs font-bold text-emerald-700 block mb-1 uppercase tracking-wide">
                        What&apos;s Included:
                      </span>
                      <ul className="text-xs text-slate-700 space-y-1 pl-4 list-disc m-0">
                        {(selected.vehicle.includes || []).map((inc, i) => (
                          <li key={i}>{inc}</li>
                        ))}
                      </ul>
                    </div>

                    <div>
                      <span className="text-xs font-bold text-rose-700 block mb-1 uppercase tracking-wide">
                        What&apos;s Excluded:
                      </span>
                      <ul className="text-xs text-slate-700 space-y-1 pl-4 list-disc m-0">
                        {(selected.vehicle.excludes || []).map((exc, i) => (
                          <li key={i}>{exc}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {/* Driver Full Details */}
              {selected.driver && (
                <div className="border border-sky-100 rounded-xl p-4 bg-sky-50/40 flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <UserCheck size={18} color="#08428c" />
                    <strong className="text-base text-slate-900">Assigned Private Hire Driver</strong>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                    {selected.driver.image_url ? (
                      <Image
                        src={selected.driver.image_url}
                        alt={selected.driver.name}
                        width={80}
                        height={80}
                        className="w-20 h-20 rounded-full object-cover border-2 border-sky-400"
                        unoptimized
                      />
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-sky-200 text-sky-700 font-bold text-2xl flex items-center justify-center">
                        {selected.driver.name.slice(0, 2).toUpperCase()}
                      </div>
                    )}

                    <div className="flex flex-col gap-1.5 flex-1 text-center sm:text-left">
                      <h4 className="text-base font-bold text-slate-800 m-0">{selected.driver.name}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600 justify-center sm:justify-start">
                        <span className="flex items-center gap-1">
                          <Phone size={13} color="#08428c" /> {selected.driver.phone}
                        </span>
                        {selected.driver.email && (
                          <span className="flex items-center gap-1">
                            <Mail size={13} color="#08428c" /> {selected.driver.email}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-slate-500 pt-1">
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">
                          License: <strong>{selected.driver.license_number}</strong>
                        </span>
                        <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">
                          ID: <strong>{selected.driver.id_number}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnSecondary}
                onClick={() => setSelected(null)}
              >
                Close Details
              </button>
              <button
                type="button"
                className={styles.primaryBtn}
                onClick={() => {
                  const s = selected;
                  setSelected(null);
                  openBooking(s);
                }}
              >
                Book This Service
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Booking Form Modal */}
      {bookingOpen && bookingService && (
        <div className={styles.modalBackdrop} onClick={() => setBookingOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>Book {bookingService.title}</h2>
              <button type="button" className={styles.closeBtn} onClick={() => setBookingOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleBookingSubmit}>
              <div className={styles.formBody}>
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div>
                    <strong className="block text-slate-800">{bookingService.vehicle?.name || bookingService.title}</strong>
                    <span className="text-slate-500">Plate: {bookingService.vehicle?.plate_number} • Driver: {bookingService.driver?.name}</span>
                  </div>
                  <span className="font-bold text-sm text-teal-800">
                    ${bookingService.price} /{PRICING_LABELS[bookingService.pricing_type] || bookingService.pricing_type}
                  </span>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.formField}>
                    <label>
                      Your Full Name <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      required
                      type="text"
                      className={styles.inputControl}
                      placeholder="e.g. John Smith"
                      value={bookingForm.full_name}
                      onChange={(e) => setBookingForm({ ...bookingForm, full_name: e.target.value })}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label>
                      Email Address <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      required
                      type="email"
                      className={styles.inputControl}
                      placeholder="e.g. john@example.com"
                      value={bookingForm.email}
                      onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label>
                      Phone Number (WhatsApp) <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      required
                      type="tel"
                      className={styles.inputControl}
                      placeholder="+255 777 000 111"
                      value={bookingForm.phone}
                      onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label>Passengers</label>
                    <input
                      required
                      type="number"
                      min="1"
                      max={bookingService.vehicle?.capacity || 10}
                      className={styles.inputControl}
                      value={bookingForm.passengers}
                      onChange={(e) => setBookingForm({ ...bookingForm, passengers: e.target.value })}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label>
                      Travel / Pickup Date <span className={styles.requiredMark}>*</span>
                    </label>
                    <input
                      required
                      type="date"
                      className={styles.inputControl}
                      value={bookingForm.travel_date}
                      onChange={(e) => setBookingForm({ ...bookingForm, travel_date: e.target.value })}
                    />
                  </div>

                  <div className={styles.formField}>
                    <label>Pickup Time</label>
                    <input
                      type="time"
                      className={styles.inputControl}
                      value={bookingForm.pickup_time}
                      onChange={(e) => setBookingForm({ ...bookingForm, pickup_time: e.target.value })}
                    />
                  </div>
                </div>

                <div className={styles.formField}>
                  <label>Pickup & Drop-off Location / Flight Number Notes</label>
                  <textarea
                    rows={3}
                    className={styles.textareaControl}
                    placeholder="e.g. Flight QR 1487 arriving ZNZ at 14:20. Drop-off at Kendwa Rocks Resort."
                    value={bookingForm.notes}
                    onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setBookingOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={bookingSubmitting}
                  className={styles.primaryBtn}
                >
                  {bookingSubmitting ? (
                    <>
                      <Loader className="animate-spin" size={16} /> Submitting...
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
