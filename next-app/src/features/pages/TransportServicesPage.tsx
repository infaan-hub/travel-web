"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { publicPrivateHireAPI, transportBookingsAPI } from "@/lib/api/client";
import { PageHero } from "@/components/PageHero";
import { useToast } from "@/components/ToastProvider";
import { Car, Users, Briefcase, Sparkles } from "@/components/icons";
import { UserCheck, Phone, Mail, X, Loader } from "lucide-react";

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

export default function TransportServicesPage() {
  const toast = useToast();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Service | null>(null);
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
      setServices(res.data?.results || []);
    } catch {
      setServices([]);
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
      passengers: "1",
      travel_date: "",
      end_date: "",
      pickup_time: "",
      notes: "",
    });
    setBookingOpen(true);
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingService) return;
    try {
      setBookingSubmitting(true);
      await transportBookingsAPI.create({
        service_id: bookingService.id,
        ...bookingForm,
      });
      toast.success("Booking request submitted! The company will confirm shortly.");
      setBookingOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit booking";
      alert(msg);
    } finally {
      setBookingSubmitting(false);
    }
  };

  return (
    <div className="page">
      <PageHero
        eyebrow="Private Hire Transport"
        title="Book verified private hire vehicles"
        subtitle="Choose a published private hire service. Each listing shows the full vehicle and assigned driver details before you book."
        backgroundImageKey="feature"
        patternImageKey="thumb"
        ctaPrimary={{ label: "Request Company Registration", href: "/contact/" }}
      />

      <div className="page-container page-section">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Available private hire services</h2>
            <p className="text-sm text-slate-500">Verified vehicles paired with professional drivers.</p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search services..."
              className="glass-input px-4 py-2 rounded-xl text-sm w-64"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader className="animate-spin" size={32} color="#14a3a3" />
          </div>
        ) : services.length === 0 ? (
          <div className="text-center py-16">
            <Car size={48} color="#94a3b8" />
            <p className="mt-4 text-slate-500">No private hire services available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {services.map((svc) => (
              <article key={svc.id} className="glass-card rounded-2xl overflow-hidden flex flex-col">
                <div className="relative h-44 bg-slate-100">
                  {svc.vehicle?.front_image_url ? (
                    <Image src={svc.vehicle.front_image_url} alt={svc.vehicle.name} fill className="object-cover" unoptimized />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400"><Car size={40} /></div>
                  )}
                  {svc.vehicle?.plate_number && (
                    <span className="absolute top-3 right-3 bg-slate-900 text-white text-xs font-mono font-bold px-2.5 py-1 rounded">
                      {svc.vehicle.plate_number}
                    </span>
                  )}
                </div>
                <div className="p-4 flex flex-col gap-3 flex-1">
                  <div>
                    <h3 className="text-base font-bold text-slate-900">{svc.title}</h3>
                    <p className="text-xs text-slate-500">{svc.company?.name}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-bold text-teal-700">
                      ${svc.price}
                      <span className="text-xs font-normal text-slate-500"> /{PRICING_LABELS[svc.pricing_type] || svc.pricing_type}</span>
                    </span>
                    {svc.vehicle && (
                      <span className="text-xs text-slate-600">{svc.vehicle.capacity} pax • {svc.vehicle.luggage_capacity} bags</span>
                    )}
                  </div>
                  {svc.vehicle && (
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold">Vehicle:</span> {svc.vehicle.name} ({svc.vehicle.category})
                    </div>
                  )}
                  {svc.driver && (
                    <div className="text-xs text-slate-600">
                      <span className="font-semibold">Driver:</span> {svc.driver.name}
                    </div>
                  )}
                  <div className="mt-auto flex gap-2">
                    <button
                      type="button"
                      className="glass-button-primary flex-1 py-2 rounded-xl text-sm font-semibold"
                      onClick={() => setSelected(svc)}
                    >
                      View full details
                    </button>
                    {svc.company?.contact_phone && (
                      <a
                        href={`https://wa.me/${svc.company.contact_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'd like to book ${svc.title}`)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="glass-button-secondary px-3 py-2 rounded-xl text-sm"
                      >
                        <Phone size={14} />
                      </a>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-bold text-slate-900">{selected.title}</h2>
                <p className="text-sm text-slate-500">{selected.company?.name}</p>
              </div>
              <button onClick={() => setSelected(null)} className="p-1"><X size={20} /></button>
            </div>

            {selected.vehicle && (
              <div className="border border-teal-100 rounded-xl p-4 bg-teal-50/30 mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Car size={18} color="#0f6b6b" />
                    <strong className="text-base text-slate-900">{selected.vehicle.name}</strong>
                  </div>
                  <span className="font-mono font-bold text-xs bg-slate-900 text-white px-2.5 py-1 rounded">
                    Plate: {selected.vehicle.plate_number}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  {[
                    { label: "Front View", url: selected.vehicle.front_image_url },
                    { label: "Side View", url: selected.vehicle.side_image_url },
                    { label: "Back View", url: selected.vehicle.back_image_url },
                  ].map((img) => (
                    <div key={img.label} className="flex flex-col gap-1">
                      <span className="text-[11px] font-semibold text-slate-600">{img.label}</span>
                      <div className="relative w-full h-28 rounded-lg overflow-hidden bg-slate-200">
                        {img.url ? (
                          <Image src={img.url} alt={img.label} fill className="object-cover" unoptimized />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">None</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-slate-600">
                  <div>👥 {selected.vehicle.capacity} Passengers • 🧳 {selected.vehicle.luggage_capacity} Bags</div>
                  <div>Category: {selected.vehicle.category}</div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3 pt-3 border-t border-teal-100">
                  <div>
                    <span className="text-xs font-bold text-emerald-700 block mb-1 uppercase">Included</span>
                    <ul className="text-xs text-slate-700 space-y-1 pl-4 list-disc m-0">
                      {(selected.vehicle.includes || []).map((inc, i) => <li key={i}>{inc}</li>)}
                    </ul>
                  </div>
                  <div>
                    <span className="text-xs font-bold text-rose-700 block mb-1 uppercase">Excluded</span>
                    <ul className="text-xs text-slate-700 space-y-1 pl-4 list-disc m-0">
                      {(selected.vehicle.excludes || []).map((exc, i) => <li key={i}>{exc}</li>)}
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {selected.driver && (
              <div className="border border-sky-100 rounded-xl p-4 bg-sky-50/30 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <UserCheck size={18} color="#0284c7" />
                  <strong className="text-base text-slate-900">Assigned Driver</strong>
                </div>
                <div className="flex items-center gap-4">
                  {selected.driver.image_url ? (
                    <Image src={selected.driver.image_url} alt={selected.driver.name} width={72} height={72} className="w-18 h-18 rounded-full object-cover border-2 border-sky-400" unoptimized />
                  ) : (
                    <div className="w-18 h-18 rounded-full bg-sky-200 text-sky-700 font-bold text-xl flex items-center justify-center">
                      {selected.driver.name.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <h4 className="text-base font-bold text-slate-800 m-0">{selected.driver.name}</h4>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-600">
                      <span className="flex items-center gap-1"><Phone size={12} color="#0284c7" /> {selected.driver.phone}</span>
                      {selected.driver.email && <span className="flex items-center gap-1"><Mail size={12} color="#0284c7" /> {selected.driver.email}</span>}
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-slate-500 pt-1">
                      <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">License: <strong>{selected.driver.license_number}</strong></span>
                      <span className="bg-white border border-slate-200 px-2 py-0.5 rounded">ID: <strong>{selected.driver.id_number}</strong></span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-2 gap-3">
              <span className="text-lg font-bold text-teal-700">
                ${selected.price} <span className="text-xs font-normal text-slate-500">/{PRICING_LABELS[selected.pricing_type] || selected.pricing_type}</span>
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="glass-button-primary px-5 py-2.5 rounded-xl text-sm font-semibold"
                  onClick={() => openBooking(selected)}
                >
                  Book now
                </button>
                {selected.company?.contact_phone && (
                  <a
                    href={`https://wa.me/${selected.company.contact_phone.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'd like to book ${selected.title}`)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="glass-button-secondary px-4 py-2.5 rounded-xl text-sm"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {bookingOpen && bookingService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setBookingOpen(false)}>
          <div className="bg-white rounded-2xl max-w-lg w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-900">Book {bookingService.title}</h2>
              <button onClick={() => setBookingOpen(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleBookingSubmit} className="flex flex-col gap-3">
              <input
                required
                placeholder="Full name"
                value={bookingForm.full_name}
                onChange={(e) => setBookingForm({ ...bookingForm, full_name: e.target.value })}
                className="glass-input px-4 py-2 rounded-xl text-sm"
              />
              <input
                required
                type="email"
                placeholder="Email"
                value={bookingForm.email}
                onChange={(e) => setBookingForm({ ...bookingForm, email: e.target.value })}
                className="glass-input px-4 py-2 rounded-xl text-sm"
              />
              <input
                required
                type="tel"
                placeholder="Phone"
                value={bookingForm.phone}
                onChange={(e) => setBookingForm({ ...bookingForm, phone: e.target.value })}
                className="glass-input px-4 py-2 rounded-xl text-sm"
              />
              <div className="grid grid-cols-2 gap-3">
                <select
                  value={bookingForm.booking_type}
                  onChange={(e) => setBookingForm({ ...bookingForm, booking_type: e.target.value })}
                  className="glass-input px-4 py-2 rounded-xl text-sm"
                >
                  <option value="transport">Transport (one trip)</option>
                  <option value="rental">Rental (date range)</option>
                </select>
                <input
                  required
                  type="date"
                  value={bookingForm.travel_date}
                  onChange={(e) => setBookingForm({ ...bookingForm, travel_date: e.target.value })}
                  className="glass-input px-4 py-2 rounded-xl text-sm"
                  placeholder="Start date"
                />
              </div>
              {bookingForm.booking_type === "rental" && (
                <input
                  type="date"
                  value={bookingForm.end_date}
                  onChange={(e) => setBookingForm({ ...bookingForm, end_date: e.target.value })}
                  className="glass-input px-4 py-2 rounded-xl text-sm"
                  placeholder="End date"
                />
              )}
              <input
                required
                type="number"
                min="1"
                placeholder="Passengers"
                value={bookingForm.passengers}
                onChange={(e) => setBookingForm({ ...bookingForm, passengers: e.target.value })}
                className="glass-input px-4 py-2 rounded-xl text-sm"
              />
              <input
                placeholder="Pickup time (optional)"
                value={bookingForm.pickup_time}
                onChange={(e) => setBookingForm({ ...bookingForm, pickup_time: e.target.value })}
                className="glass-input px-4 py-2 rounded-xl text-sm"
              />
              <textarea
                placeholder="Notes (optional)"
                rows={3}
                value={bookingForm.notes}
                onChange={(e) => setBookingForm({ ...bookingForm, notes: e.target.value })}
                className="glass-input px-4 py-2 rounded-xl text-sm"
              />
              <div className="flex justify-end gap-2 mt-2">
                <button type="button" className="glass-button-secondary px-4 py-2 rounded-xl text-sm" onClick={() => setBookingOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={bookingSubmitting} className="glass-button-primary px-5 py-2 rounded-xl text-sm font-semibold">
                  {bookingSubmitting ? "Submitting..." : "Submit booking"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
