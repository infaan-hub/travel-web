"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { publicPrivateHireAPI } from "@/lib/api/client";
import { getImageUrl } from "@/lib/utils/image-url";

type Service = { id: number; title: string; description: string; price: string; pricing_type: string; vehicle: { name: string; category: string; capacity: number; luggage_capacity: number; description: string; includes: string[]; excludes: string[]; front_image_url: string | null; side_image_url: string | null; back_image_url: string | null } | null; driver: { name: string; image_url: string | null } | null; company: { name: string; slug: string; contact_phone: string; contact_email: string } | null };

export default function PrivateHireServiceDetailPage() {
  const { id } = useParams<Record<string, string>>();
  const [service, setService] = useState<Service | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => { publicPrivateHireAPI.getById(id).then((r) => setService(r.data)).catch(() => setService(null)).finally(() => setLoading(false)); }, [id]);
  if (loading) return <main className="page page-container page-section">Loading private hire service…</main>;
  if (!service) return <main className="page page-container page-section"><h1>Private hire service not found</h1><Link href="/transport/">Browse available services</Link></main>;
  const images = [service.vehicle?.front_image_url, service.vehicle?.side_image_url, service.vehicle?.back_image_url].filter((image): image is string => Boolean(image));
  return <main className="page page-container page-section">
    <Link href="/transport/" className="text-sm text-teal-700">← Browse private hire</Link>
    <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 mt-5">
      <section>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{images.map((image, index) => <div key={image} className={(index === 0 ? "sm:col-span-2 h-80" : "h-44") + " relative overflow-hidden rounded-2xl bg-slate-100"}><Image src={getImageUrl(image)} alt={service.vehicle?.name || service.title} fill className="object-cover" unoptimized /></div>)}</div>
        <p className="text-xs font-bold tracking-widest uppercase text-teal-700 mt-7">Private hire service</p>
        <h1 className="text-3xl md:text-4xl font-bold text-slate-900 mt-2">{service.title}</h1>
        <p className="text-slate-600 leading-7 mt-4">{service.description || "Arrange a private vehicle and driver for your journey."}</p>
        {service.vehicle && <section className="glass-card rounded-2xl p-5 mt-6"><h2 className="text-xl font-bold">Vehicle details</h2><p className="mt-2 text-slate-700">{service.vehicle.name} · {service.vehicle.category}</p><p className="text-sm text-slate-600 mt-1">Seats {service.vehicle.capacity} passengers and {service.vehicle.luggage_capacity} bags.</p>{service.vehicle.description && <p className="text-sm text-slate-600 mt-3">{service.vehicle.description}</p>}<div className="grid sm:grid-cols-2 gap-4 mt-4">{service.vehicle.includes.length > 0 && <div><h3 className="font-semibold">Included</h3><ul className="list-disc ml-5 text-sm">{service.vehicle.includes.map((item) => <li key={item}>{item}</li>)}</ul></div>}{service.vehicle.excludes.length > 0 && <div><h3 className="font-semibold">Not included</h3><ul className="list-disc ml-5 text-sm">{service.vehicle.excludes.map((item) => <li key={item}>{item}</li>)}</ul></div>}</div></section>}
      </section>
      <aside className="glass-card rounded-2xl p-6 h-fit lg:sticky lg:top-24"><p className="text-sm text-slate-500">Starting price</p><p className="text-3xl font-bold text-teal-700 mt-1">TZS {service.price}</p><p className="text-sm text-slate-500">per {service.pricing_type.replaceAll("_", " ")}</p>{service.driver && <p className="mt-5 text-sm">Professional driver: <strong>{service.driver.name}</strong></p>}{service.company && <Link href={"/company/" + service.company.slug + "/"} className="block mt-4 text-sm text-teal-700">Provided by {service.company.name}</Link>}<Link href={"/booking/" + service.id + "/"} className="block text-center mt-6 glass-button-primary px-5 py-3 rounded-xl font-semibold">Request this service</Link>{service.company?.contact_phone && <a href={"tel:" + service.company.contact_phone} className="block text-center mt-3 text-sm text-teal-700">Call provider</a>}</aside>
    </div>
  </main>;
}
