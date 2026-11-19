"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { publicPrivateHireAPI, transportBookingsAPI } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import { getImageUrl } from "@/lib/utils/image-url";

type Service = {
  id: number; title: string; description: string; price: string; pricing_type: string;
  vehicle: { name: string; category: string; capacity: number; luggage_capacity: number; front_image_url: string | null } | null;
  driver: { name: string } | null;
  company: { name: string; slug: string } | null;
};

export default function BookingPage() {
  const { tourId: serviceId } = useParams<Record<string, string>>();
  const router = useRouter();
  const { user } = useAuth();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ full_name: "", email: "", phone: "", passengers: "1", travel_date: "", pickup_time: "", notes: "" });

  useEffect(() => {
    if (!serviceId) { setLoading(false); return; }
    publicPrivateHireAPI.getById(serviceId)
      .then((response) => setService(response.data))
      .catch(() => setService(null))
      .finally(() => setLoading(false));
  }, [serviceId]);

  useEffect(() => {
    if (!user) return;
    setForm((current) => ({ ...current, full_name: current.full_name || user.username || "", email: current.email || user.email || "" }));
  }, [user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!service) return;
    setSending(true); setError("");
    try {
      await transportBookingsAPI.create({ ...form, service_id: service.id, passengers: Number(form.passengers) });
      setSubmitted(true);
    } catch (cause: any) {
      setError(cause?.response?.data?.message || "We could not submit your request. Please try again.");
    } finally { setSending(false); }
  }

  if (loading) return <main className="page page-container page-section" aria-busy="true">Loading private hire service…</main>;
  if (!service) return <main className="page page-container page-section"><h1>Service unavailable</h1><p>This private hire service is no longer available.</p><Link href="/transport/">Browse private hire services</Link></main>;
  if (submitted) return <main className="page page-container page-section"><section className="glass-card rounded-2xl p-8 max-w-2xl mx-auto"><p className="text-sm font-semibold text-[#08428c]">Request received</p><h1 className="text-3xl font-bold mt-2">Your private hire request is on its way.</h1><p className="mt-3 text-slate-600">{service.company?.name || "The provider"} will contact you about availability and next steps.</p><div className="mt-6 flex gap-3"><Link className="glass-button-primary px-5 py-3 rounded-xl" href="/my-transport/">View my requests</Link><Link className="glass-button-secondary px-5 py-3 rounded-xl" href="/transport/">Browse more services</Link></div></section></main>;

  return <main className="page page-container page-section">
    <Link href="/transport/" className="text-sm text-[#08428c]">← All private hire services</Link>
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 mt-5">
      <section className="glass-card rounded-2xl p-6 md:p-8">
        <p className="text-xs font-bold tracking-widest uppercase text-[#08428c]">Private hire request</p>
        <h1 className="text-3xl font-bold text-slate-900 mt-2">Book {service.title}</h1>
        <p className="text-slate-600 mt-3">Send the provider your journey details. They will confirm availability and final arrangements with you.</p>
        {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 text-rose-700 p-3">{error}</p>}
        <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
          <label className="text-sm font-medium">Full name *<input required maxLength={160} className="glass-input w-full mt-1 px-3 py-2 rounded-lg" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
          <label className="text-sm font-medium">Email *<input required type="email" maxLength={254} className="glass-input w-full mt-1 px-3 py-2 rounded-lg" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
          <label className="text-sm font-medium">Phone *<input required type="tel" maxLength={40} className="glass-input w-full mt-1 px-3 py-2 rounded-lg" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
          <label className="text-sm font-medium">Passengers *<input required type="number" min="1" max={service.vehicle?.capacity || 100} className="glass-input w-full mt-1 px-3 py-2 rounded-lg" value={form.passengers} onChange={(e) => setForm({ ...form, passengers: e.target.value })} /></label>
                    <label className="text-sm font-medium">Travel date *<input required type="date" className="glass-input w-full mt-1 px-3 py-2 rounded-lg" value={form.travel_date} onChange={(e) => setForm({ ...form, travel_date: e.target.value })} /></label>
          <label className="text-sm font-medium">Pickup time<input type="time" className="glass-input w-full mt-1 px-3 py-2 rounded-lg" value={form.pickup_time} onChange={(e) => setForm({ ...form, pickup_time: e.target.value })} /></label>
          <label className="text-sm font-medium sm:col-span-2">Pickup location and journey notes<textarea rows={4} maxLength={5000} className="glass-input w-full mt-1 px-3 py-2 rounded-lg" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Share your pickup location, destination, luggage needs, or other details." /></label>
          <button disabled={sending} className="sm:col-span-2 px-5 py-3 rounded-xl font-semibold text-white bg-[#08428c] hover:bg-[#063a78] disabled:opacity-60">{sending ? "Sending request…" : "Send private hire request"}</button>
        </form>
      </section>
      <aside className="glass-card rounded-2xl overflow-hidden h-fit">
        {service.vehicle?.front_image_url && <div className="relative h-52"><Image src={getImageUrl(service.vehicle.front_image_url)} alt={service.vehicle.name} fill className="object-cover" unoptimized /></div>}
        <div className="p-5"><h2 className="text-xl font-bold">{service.title}</h2><p className="text-sm text-slate-600 mt-2">{service.description}</p><p className="text-2xl font-bold text-[#08428c] mt-4">TZS {service.price} <span className="text-xs font-normal text-slate-500">/ {service.pricing_type.replaceAll("_", " ")}</span></p>{service.vehicle && <p className="text-sm text-slate-600 mt-3">{service.vehicle.name} · {service.vehicle.capacity} passengers · {service.vehicle.luggage_capacity} bags</p>}{service.driver && <p className="text-sm text-slate-600 mt-2">Driver: {service.driver.name}</p>}{service.company && <Link className="inline-block text-sm text-[#08428c] mt-4" href={"/company/" + service.company.slug + "/"}>Provided by {service.company.name}</Link>}<p className="text-xs text-slate-500 mt-4">This is a request. The provider will confirm availability and price details with you.</p></div>
      </aside>
    </div>
  </main>;
}
