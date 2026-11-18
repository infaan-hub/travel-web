"use client";

import { useCallback, useEffect, useState } from "react";
import { transportBookingsAPI, transportTripRequestsAPI, transportReviewsAPI } from "@/lib/api/client";
import { useToast } from "@/components/ToastProvider";
import { PageHero } from "@/components/PageHero";
import { Car, ClipboardList, Loader } from "@/components/icons";

export default function MyTransportPage() {
  const toast = useToast();
  const [bookings, setBookings] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: "5", content: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [bRes, rRes] = await Promise.all([
        transportBookingsAPI.getAll().catch(() => ({ data: [] })),
        transportTripRequestsAPI.getAll().catch(() => ({ data: [] })),
      ]);
      setBookings(Array.isArray(bRes.data) ? bRes.data : bRes.data?.results || []);
      setRequests(Array.isArray(rRes.data) ? rRes.data : rRes.data?.results || []);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      toast.error ? toast.error(msg) : null;
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openReview = (id: number) => {
    setReviewBookingId(id);
    setReviewForm({ rating: "5", content: "" });
    setReviewOpen(true);
  };

  const submitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBookingId) return;
    try {
      setReviewSubmitting(true);
      await transportReviewsAPI.create({
        transport_booking_id: reviewBookingId,
        rating: reviewForm.rating,
        content: reviewForm.content,
      });
      toast.success("Review submitted for moderation.");
      setReviewOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit review";
      toast.error ? toast.error(msg) : alert(msg);
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="page">
      <PageHero
        eyebrow="My Transport"
        title="Track your bookings and trip requests"
        subtitle="View status updates for private hire bookings and custom trip requests."
        backgroundImageKey="feature"
        patternImageKey="thumb"
      />
      <div className="page-container page-section flex flex-col gap-8">
        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <Car size={20} color="#14a3a3" /> Private Hire Bookings
          </h2>
          {loading ? (
            <div className="flex justify-center py-8"><Loader className="animate-spin" size={28} color="#14a3a3" /></div>
          ) : bookings.length === 0 ? (
            <p className="text-slate-500">No bookings yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {bookings.map((b) => (
                <div key={b.id} className="glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{b.service?.title || "Transport booking"}</div>
                    <div className="text-xs text-slate-500">
                      {b.travel_date ? new Date(b.travel_date).toISOString().slice(0, 10) : ""} • {b.passengers} pax • ${b.total_price}
                    </div>
                    {b.service?.vehicle && (
                      <div className="text-xs text-slate-600 mt-1">
                        {b.service.vehicle.name} ({b.service.vehicle.plate_number})
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                      {b.status}
                    </span>
                    {b.status === "completed" && (
                      <button
                        type="button"
                        className="text-xs text-teal-700 underline"
                        onClick={() => openReview(b.id)}
                      >
                        Leave review
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
            <ClipboardList size={20} color="#14a3a3" /> Custom Trip Requests
          </h2>
          {loading ? null : requests.length === 0 ? (
            <p className="text-slate-500">No trip requests yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {requests.map((r) => (
                <div key={r.id} className="glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <div className="font-semibold text-slate-900">{r.origin} → {r.destination}</div>
                    <div className="text-xs text-slate-500">
                      {r.travel_date ? new Date(r.travel_date).toISOString().slice(0, 10) : ""} • {r.passengers} pax
                    </div>
                  </div>
                  <span className="text-xs font-semibold px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      {reviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setReviewOpen(false)}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-xl font-bold text-slate-900 mb-4">Leave a review</h2>
            <form onSubmit={submitReview} className="flex flex-col gap-3">
              <select
                value={reviewForm.rating}
                onChange={(e) => setReviewForm({ ...reviewForm, rating: e.target.value })}
                className="glass-input px-4 py-2 rounded-xl text-sm"
              >
                {[5, 4, 3, 2, 1].map((r) => (
                  <option key={r} value={r}>{r} stars</option>
                ))}
              </select>
              <textarea
                required
                rows={4}
                placeholder="Share your experience..."
                value={reviewForm.content}
                onChange={(e) => setReviewForm({ ...reviewForm, content: e.target.value })}
                className="glass-input px-4 py-2 rounded-xl text-sm"
              />
              <div className="flex justify-end gap-2">
                <button type="button" className="glass-button-secondary px-4 py-2 rounded-xl text-sm" onClick={() => setReviewOpen(false)}>
                  Cancel
                </button>
                <button type="submit" disabled={reviewSubmitting} className="glass-button-primary px-5 py-2 rounded-xl text-sm font-semibold">
                  {reviewSubmitting ? "Submitting..." : "Submit review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
