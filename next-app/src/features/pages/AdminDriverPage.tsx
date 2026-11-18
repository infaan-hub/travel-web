"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import { useToast } from "@/components/ToastProvider";
import { PageHero } from "@/components/PageHero";
import { Loader, CheckCircle } from "lucide-react";

export default function AdminDriverPage() {
  const toast = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    license_number: "",
    id_type: "ZAN_ID",
    id_number: "",
    vehicle_name: "",
    plate_number: "",
    category: "Sedan",
    capacity: "4",
    luggage_capacity: "2",
    vehicle_description: "",
    includes: "A/C\nFuel\nMineral Water",
    excludes: "Driver Tips\nPark Entry Fees",
    service_title: "",
    price: "45.00",
    pricing_type: "per_trip",
    service_description: "",
  });

  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [sideFile, setSideFile] = useState<File | null>(null);
  const [backFile, setBackFile] = useState<File | null>(null);
  const [driverImage, setDriverImage] = useState<File | null>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k, v));
      if (frontFile) fd.append("front_image", frontFile);
      if (sideFile) fd.append("side_image", sideFile);
      if (backFile) fd.append("back_image", backFile);
      if (driverImage) fd.append("driver_image", driverImage);

      const res = await fetch("/api/admin/drivers", {
        method: "POST",
        body: fd,
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "Failed to register driver");
      }
      setSuccess(true);
      toast.success("Public hire driver registered successfully.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to register driver";
      toast.error ? toast.error(msg) : alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <PageHero
        eyebrow="Admin · Public Hire Drivers"
        title="Register a public hire driver"
        subtitle="Register an independent driver with their own vehicle as a public hire service."
        backgroundImageKey="feature"
        patternImageKey="thumb"
      />
      <div className="page-container page-section max-w-4xl">
        {success ? (
          <div className="text-center py-12">
            <CheckCircle size={48} color="#0e7c5a" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">Driver registered</h2>
            <button className="glass-button-primary mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold" onClick={() => setSuccess(false)}>
              Register another
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 flex flex-col gap-4">
            <h2 className="text-lg font-bold text-slate-900">Driver details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input name="name" required placeholder="Driver full name" value={form.name} onChange={handleChange} className="glass-input px-4 py-2 rounded-xl text-sm" />
              <input name="phone" required type="tel" placeholder="Phone" value={form.phone} onChange={handleChange} className="glass-input px-4 py-2 rounded-xl text-sm" />
              <input name="email" type="email" placeholder="Email" value={form.email} onChange={handleChange} className="glass-input px-4 py-2 rounded-xl text-sm" />
              <input name="license_number" required placeholder="License number" value={form.license_number} onChange={handleChange} className="glass-input px-4 py-2 rounded-xl text-sm" />
              <select name="id_type" value={form.id_type} onChange={handleChange} className="glass-input px-4 py-2 rounded-xl text-sm">
                <option value="ZAN_ID">ZanID</option>
                <option value="NIDA">NIDA</option>
                <option value="PASSPORT">Passport</option>
              </select>
              <input name="id_number" required placeholder="ID number" value={form.id_number} onChange={handleChange} className="glass-input px-4 py-2 rounded-xl text-sm" />
            </div>
            <input type="file" accept="image/*" onChange={(e) => setDriverImage(e.target.files?.[0] || null)} className="text-sm" />

            <h2 className="text-lg font-bold text-slate-900 mt-4">Vehicle details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input name="vehicle_name" required placeholder="Vehicle name/model" value={form.vehicle_name} onChange={handleChange} className="glass-input px-4 py-2 rounded-xl text-sm" />
              <input name="plate_number" required placeholder="Plate number" value={form.plate_number} onChange={handleChange} className="glass-input px-4 py-2 rounded-xl text-sm" />
              <select name="category" value={form.category} onChange={handleChange} className="glass-input px-4 py-2 rounded-xl text-sm">
                {["Sedan", "SUV 4x4", "Minivan", "Safari Cruiser", "Coaster Bus", "Luxury VIP"].map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <input name="capacity" type="number" min="1" placeholder="Seats" value={form.capacity} onChange={handleChange} className="glass-input px-4 py-2 rounded-xl text-sm" />
              <input name="luggage_capacity" type="number" min="0" placeholder="Luggage bags" value={form.luggage_capacity} onChange={handleChange} className="glass-input px-4 py-2 rounded-xl text-sm" />
            </div>
            <textarea name="vehicle_description" rows={2} placeholder="Vehicle description" value={form.vehicle_description} onChange={handleChange} className="glass-input px-4 py-2 rounded-xl text-sm" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <textarea name="includes" rows={3} placeholder="Included (one per line)" value={form.includes} onChange={handleChange} className="glass-input px-4 py-2 rounded-xl text-sm" />
              <textarea name="excludes" rows={3} placeholder="Excluded (one per line)" value={form.excludes} onChange={handleChange} className="glass-input px-4 py-2 rounded-xl text-sm" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input type="file" accept="image/*" onChange={(e) => setFrontFile(e.target.files?.[0] || null)} className="text-sm" />
              <input type="file" accept="image/*" onChange={(e) => setSideFile(e.target.files?.[0] || null)} className="text-sm" />
              <input type="file" accept="image/*" onChange={(e) => setBackFile(e.target.files?.[0] || null)} className="text-sm" />
            </div>

            <h2 className="text-lg font-bold text-slate-900 mt-4">Service details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input name="service_title" required placeholder="Service title" value={form.service_title} onChange={handleChange} className="glass-input px-4 py-2 rounded-xl text-sm" />
              <input name="price" required type="number" step="0.01" placeholder="Price" value={form.price} onChange={handleChange} className="glass-input px-4 py-2 rounded-xl text-sm" />
              <select name="pricing_type" value={form.pricing_type} onChange={handleChange} className="glass-input px-4 py-2 rounded-xl text-sm">
                <option value="per_trip">Per trip</option>
                <option value="per_day">Per day</option>
                <option value="per_hour">Per hour</option>
              </select>
            </div>
            <textarea name="service_description" rows={2} placeholder="Service description" value={form.service_description} onChange={handleChange} className="glass-input px-4 py-2 rounded-xl text-sm" />

            <button type="submit" disabled={submitting} className="glass-button-primary py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2">
              {submitting ? <Loader className="animate-spin" size={16} /> : null}
              {submitting ? "Registering..." : "Register public hire driver"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
