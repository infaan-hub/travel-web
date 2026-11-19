"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { publicPrivateHireAPI, transportBookingsAPI } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import { getImageUrl } from "@/lib/utils/image-url";
import styles from "@/features/pages/transport-service-detail.module.css";

type Service = {
  id: number; title: string; description: string; price: string; pricing_type: string;
  vehicle: { name: string; category: string; capacity: number; luggage_capacity: number; plate_number?: string; front_image_url: string | null } | null;
  driver: { name: string } | null;
  company: { name: string; slug: string; contact_phone?: string } | null;
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
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!serviceId) { setLoading(false); return; }
    publicPrivateHireAPI.getById(serviceId)
      .then((response) => setService(response.data))
      .catch(() => setService(null))
      .finally(() => setLoading(false));
  }, [serviceId]);

  useEffect(() => {
    if (!user) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  if (loading) return <div className={`page ${styles.page}`}><div className={styles.stateCard} role="status"><p>Loading private hire service…</p></div></div>;
  if (!service) return <div className={`page ${styles.page}`}><div className={styles.stateCard}><h1>Service unavailable</h1><p>This private hire service is no longer available.</p><Link href="/transport/" className={styles.stateLink}>Browse private hire services</Link></div></div>;

  const pricingLabel = service.pricing_type.replaceAll("_", " ");
  const driverName = service.driver?.name?.trim() || "Assigned driver";

  if (submitted) return (
    <div className={`page ${styles.page}`}>
      <div className={styles.panel}>
        <p className="text-sm font-semibold text-[#08428c]">Request received</p>
        <h1 className="text-3xl font-bold mt-2 text-[#08428c]">Your private hire request is on its way.</h1>
        <p className="mt-3 text-slate-600">{service.company?.name || "The provider"} will contact you about availability and next steps.</p>
        <div className="mt-6 flex gap-3">
          <Link className={styles.bookAction} href="/my-transport/" style={{ textDecoration: "none" }}>View my requests</Link>
          <Link className={styles.stateLink} href="/transport/" style={{ textDecoration: "none", background: "#e7eef9", color: "#08428c" }}>Browse more services</Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`page ${styles.page}`}>
      <header className={styles.hero}>
        {service.vehicle?.front_image_url ? (
          <div className={styles.heroMedia} aria-hidden="true">
            <Image src={getImageUrl(service.vehicle.front_image_url)} alt="" fill sizes="100vw" className={styles.heroImage} priority unoptimized />
            <span className={styles.heroScrim} />
          </div>
        ) : null}
        <div className={styles.heroTop}>
          <Link href="/transport/" className={styles.backLink}><span>← All private hire services</span></Link>
          <span className={styles.heroBadge}><span>Verified private hire</span></span>
        </div>
        <div className={styles.heroBody}>
          <div className={styles.heroCopy}>
            <span className={styles.kicker}>Private hire request</span>
            <h1 className={styles.title}>Book {service.title}</h1>
            {service.company ? <p className={styles.company}>{service.company.name}</p> : null}
            <p className={styles.description}>Send the provider your journey details. They will confirm availability and final arrangements with you.</p>
          </div>
          <div className={styles.heroPrice}>
            <span className={styles.priceValue}>${service.price}</span>
            <span className={styles.priceUnit}>/ {pricingLabel}</span>
          </div>
        </div>
        {service.vehicle ? (
          <ul className={styles.heroFacts}>
            <li><span>{service.vehicle.name}</span>{service.vehicle.plate_number ? <em>{service.vehicle.plate_number}</em> : null}</li>
            <li><span>{service.vehicle.capacity} passengers</span></li>
            <li><span>{service.vehicle.luggage_capacity} luggage bags</span></li>
          </ul>
        ) : null}
      </header>

      <div className={styles.layout}>
        <main className={styles.main}>
          <section className={styles.panel} aria-labelledby="booking-heading">
            <div className={styles.panelHead}>
              <div>
                <span className={styles.sectionKicker}>Private hire request</span>
                <h2 id="booking-heading" className={styles.panelTitle}>Book {service.title}</h2>
              </div>
            </div>
            {error && <p role="alert" className="mt-4 rounded-lg bg-rose-50 text-rose-700 p-3">{error}</p>}
            <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-6">
              <label className="text-sm font-medium">Full name *<input required maxLength={160} className="glass-input w-full mt-1 px-3 py-2 rounded-lg" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /></label>
              <label className="text-sm font-medium">Email *<input required type="email" maxLength={254} className="glass-input w-full mt-1 px-3 py-2 rounded-lg" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></label>
              <label className="text-sm font-medium">Phone *<input required type="tel" maxLength={40} className="glass-input w-full mt-1 px-3 py-2 rounded-lg" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></label>
              <label className="text-sm font-medium">Passengers *<input required type="number" min="1" max={service.vehicle?.capacity || 100} className="glass-input w-full mt-1 px-3 py-2 rounded-lg" value={form.passengers} onChange={(e) => setForm({ ...form, passengers: e.target.value })} /></label>
              <label className="text-sm font-medium">Travel date *<input required type="date" className="glass-input w-full mt-1 px-3 py-2 rounded-lg" value={form.travel_date} onChange={(e) => setForm({ ...form, travel_date: e.target.value })} /></label>
              <label className="text-sm font-medium">Pickup time<input type="time" className="glass-input w-full mt-1 px-3 py-2 rounded-lg" value={form.pickup_time} onChange={(e) => setForm({ ...form, pickup_time: e.target.value })} /></label>
              <label className="text-sm font-medium sm:col-span-2">Pickup location and journey notes<textarea rows={4} maxLength={5000} className="glass-input w-full mt-1 px-3 py-2 rounded-lg" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Share your pickup location, destination, luggage needs, or other details." /></label>
              <button disabled={sending} className={styles.bookAction} type="submit">{sending ? "Sending request…" : "Send private hire request"}</button>
            </form>
          </section>
        </main>

        <aside className={styles.aside}>
          <div className={styles.bookingCard}>
            <span className={styles.asideKicker}>Starting price</span>
            <p className={styles.asidePrice}>${service.price}<span>/ {pricingLabel}</span></p>
            {service.vehicle ? <p className={styles.asideNote}>{service.vehicle.name} · up to {service.vehicle.capacity} passengers and {service.vehicle.luggage_capacity} bags</p> : null}
            {service.company?.contact_phone ? (
              <div className={styles.contactActions}>
                <a href={`tel:${service.company.contact_phone.replace(/\D/g, "")}`} className={styles.contactLink}>Call provider</a>
              </div>
            ) : null}
            {service.company ? <Link href={`/company/${service.company.slug}/`} className={styles.providerLink}>View provider profile</Link> : null}
            {service.driver ? <p className={styles.driverNote}>Driver: {driverName}</p> : null}
          </div>
        </aside>
      </div>
    </div>
  );
}
