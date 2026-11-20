"use client";

import { useState } from "react";
import { transportTripRequestsAPI } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ToastProvider";
import { PageHero } from "@/components/PageHero";
import { MapPin, Users, Calendar, Loader, CheckCircle } from "lucide-react";

export default function TripRequestPage() {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const toast = useToast();

  if (!authLoading && !isAuthenticated) {
    return (
      <div className="page">
        <PageHero
          eyebrow="Custom Trip Request"
          title="Sign in to request a trip"
          subtitle="You need to be signed in to submit a custom transport trip request."
          backgroundImageKey="feature"
          patternImageKey="thumb"
        />
        <div className="page-container page-section max-w-2xl text-center">
          <a href="/login/?from=%2Ftrip-request%2F" className="glass-button-primary inline-block px-6 py-2.5 rounded-xl text-sm font-semibold">
            Sign in
          </a>
        </div>
      </div>
    );
  }
  const [form, setForm] = useState({
    origin: "",
    destination: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    travel_date: "",
    passengers: "1",
    luggage: "0",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await transportTripRequestsAPI.create(form);
      setSuccess(true);
      toast.success("Trip request submitted. Approved public hire drivers can now respond.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit request";
      toast.error ? toast.error(msg) : alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="page">
      <PageHero
        eyebrow="Custom Trip Request"
        title="Request a custom transport trip"
        subtitle="Tell us your route, dates, and contact details. Approved public hire drivers can accept your request directly."
        backgroundImageKey="feature"
        patternImageKey="thumb"
      />
      <div className="page-container page-section max-w-2xl">
        {success ? (
          <div className="text-center py-12">
            <CheckCircle size={48} color="#0e7c5a" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">Request submitted</h2>
            <p className="text-slate-500 mt-2">Your request is available to approved public hire drivers. A driver will receive your contact details after accepting it. You can track it in My Transport.</p>
            <button className="glass-button-primary mt-6 px-6 py-2.5 rounded-xl text-sm font-semibold" onClick={() => setSuccess(false)}>
              Submit another request
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="glass-card rounded-2xl p-6 flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <MapPin size={18} color="#14a3a3" />
              <h2 className="text-lg font-bold text-slate-900">Trip details</h2>
            </div>
            <input
              required
              placeholder="Pickup location (origin)"
              value={form.origin}
              onChange={(e) => setForm({ ...form, origin: e.target.value })}
              className="glass-input px-4 py-2 rounded-xl text-sm"
            />
            <input
              required
              placeholder="Drop-off location (destination)"
              value={form.destination}
              onChange={(e) => setForm({ ...form, destination: e.target.value })}
              className="glass-input px-4 py-2 rounded-xl text-sm"
            />
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input required maxLength={160} placeholder="Your name" value={form.contact_name} onChange={(e) => setForm({ ...form, contact_name: e.target.value })} className="glass-input px-4 py-2 rounded-xl text-sm" />
              <input required type="email" maxLength={254} placeholder="Email address" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className="glass-input px-4 py-2 rounded-xl text-sm" />
              <input required type="tel" minLength={5} maxLength={40} placeholder="Phone number" value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className="glass-input px-4 py-2 rounded-xl text-sm" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                required
                type="date"
                value={form.travel_date}
                onChange={(e) => setForm({ ...form, travel_date: e.target.value })}
                className="glass-input px-4 py-2 rounded-xl text-sm"
              />
              <input
                required
                type="number"
                min="1"
                placeholder="Passengers"
                value={form.passengers}
                onChange={(e) => setForm({ ...form, passengers: e.target.value })}
                className="glass-input px-4 py-2 rounded-xl text-sm"
              />
              <input
                type="number"
                min="0"
                placeholder="Luggage bags"
                value={form.luggage}
                onChange={(e) => setForm({ ...form, luggage: e.target.value })}
                className="glass-input px-4 py-2 rounded-xl text-sm"
              />
            </div>
            <textarea
              rows={4}
              placeholder="Notes (preferred vehicle type, child seats, stops, etc.)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="glass-input px-4 py-2 rounded-xl text-sm"
            />
            <button
              type="submit"
              disabled={submitting}
              className="glass-button-primary py-3 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            >
              {submitting ? <Loader className="animate-spin" size={16} /> : null}
              {submitting ? "Submitting..." : "Submit trip request"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
