"use client";

import { useState } from "react";
import { transportTripRequestsAPI } from "@/lib/api/client";
import { useToast } from "@/components/ToastProvider";
import { PageHero } from "@/components/PageHero";
import { MapPin, Users, Calendar, Loader, CheckCircle } from "lucide-react";

export default function TripRequestPage() {
  const toast = useToast();
  const [form, setForm] = useState({
    origin: "",
    destination: "",
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
      toast.success("Trip request submitted. Companies will send quotes.");
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
        subtitle="Tell us your route and dates. Transport companies will review and send you quotes."
        backgroundImageKey="feature"
        patternImageKey="thumb"
      />
      <div className="page-container page-section max-w-2xl">
        {success ? (
          <div className="text-center py-12">
            <CheckCircle size={48} color="#0e7c5a" />
            <h2 className="mt-4 text-xl font-bold text-slate-900">Request submitted</h2>
            <p className="text-slate-500 mt-2">Companies will review your request and send quotes. You can track status in your bookings.</p>
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
