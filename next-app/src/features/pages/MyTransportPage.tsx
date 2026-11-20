"use client";

import { useCallback, useEffect, useState } from "react";
import { transportBookingsAPI, transportTripRequestsAPI, transportReviewsAPI } from "@/lib/api/client";
import { useToast } from "@/components/ToastProvider";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { PageHero } from "@/components/PageHero";
import { Car, ClipboardList, Loader } from "@/components/icons";

function formatTravelDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatDuration(minutes: number | null | undefined) {
  if (minutes == null || !Number.isFinite(minutes)) return "";
  if (minutes < 60) return `${Math.max(1, Math.round(minutes))} min`;
  const hours = Math.floor(minutes / 60);
  const rest = Math.round(minutes % 60);
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

function formatDistance(km: number | null | undefined) {
  if (km == null || !Number.isFinite(km)) return "";
  return km < 10 ? `${km.toFixed(1)} km` : `${Math.round(km)} km`;
}

export default function MyTransportPage() {
  const toast = useToast();
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [bookings, setBookings] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [reviewForm, setReviewForm] = useState({ rating: "5", content: "" });
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (authLoading) return;
    if (!isAuthenticated) { router.replace("/login/?from=%2Fmy-transport%2F"); return; }
    try {
      const [bRes, rRes] = await Promise.all([
        transportBookingsAPI.getAll().catch(() => ({ data: [] })),
        transportTripRequestsAPI.getAll().catch(() => ({ data: [] })),
      ]);
      setBookings(Array.isArray(bRes.data) ? bRes.data : bRes.data?.results || []);
      const requestList: any[] = Array.isArray(rRes.data)
        ? rRes.data
        : rRes.data?.results || [];
      // Trip-first bookings create a linked trip request. Keep the booking as
      // the single visible record instead of showing the same journey twice.
      setRequests(
        requestList.filter(
          (request) => !Array.isArray(request.bookings) || request.bookings.length === 0,
        ),
      );
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to load";
      toast.error ? toast.error(msg) : null;
    } finally {
      setLoading(false);
    }
  }, [authLoading, isAuthenticated, router, toast]);

  useEffect(() => {
    // Loading the signed-in customer's transport records is the external
    // synchronization this effect exists for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const cancelBooking = async (id: number) => {
    try {
      await transportBookingsAPI.cancel(id);
      setBookings((current) => current.map((booking) => booking.id === id ? { ...booking, status: "cancelled" } : booking));
      toast.success("Booking request cancelled.");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Could not cancel this booking request.");
    }
  };

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
              {bookings.map((b) => {
                const trip = b.trip ?? b;
                const origin = trip.origin ?? b.origin;
                const destination = trip.destination ?? b.destination;
                const pickupTime = trip.pickup_time ?? b.pickup_time;
                const journey = [
                  formatDistance(trip.distance_km ?? b.distance_km),
                  formatDuration(trip.duration_mins ?? b.duration_mins),
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <div key={b.id} className="glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-semibold text-slate-900">{b.service?.title || "Transport booking"}</div>
                        {b.reference ? (
                          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                            {b.reference}
                          </span>
                        ) : null}
                      </div>
                      {origin || destination ? (
                        <div className="text-sm text-slate-700 mt-1 break-words">
                          {origin || "Pickup"} → {destination || "Destination"}
                        </div>
                      ) : null}
                      <div className="text-xs text-slate-500 mt-1">
                        {formatTravelDate(b.travel_date)}
                        {pickupTime ? ` at ${pickupTime}` : ""} • {b.passengers} pax
                        {b.total_price ? ` • $${b.total_price}` : ""}
                      </div>
                      {journey ? <div className="text-xs text-slate-600 mt-1">{journey}</div> : null}
                      {b.service?.vehicle && (
                        <div className="text-xs text-slate-600 mt-1">
                          {b.service.vehicle.name}
                          {b.service.vehicle.plate_number ? ` (${b.service.vehicle.plate_number})` : ""}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span className="text-xs font-semibold px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                        {b.status}
                      </span>
                      {b.status === "pending" && (
                        <button type="button" className="text-xs text-rose-700 underline" onClick={() => void cancelBooking(b.id)}>Cancel request</button>
                      )}
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
                );
              })}
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
              {requests.map((r) => {
                const journey = [
                  formatDistance(r.distance_km),
                  formatDuration(r.duration_mins),
                ]
                  .filter(Boolean)
                  .join(" · ");

                return (
                  <div key={r.id} className="glass-card rounded-xl p-4 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 break-words">{r.origin} → {r.destination}</div>
                      <div className="text-xs text-slate-500 mt-1">
                        {formatTravelDate(r.travel_date)}
                        {r.pickup_time ? ` at ${r.pickup_time}` : ""} • {r.passengers} pax
                      </div>
                      {journey ? <div className="text-xs text-slate-600 mt-1">{journey}</div> : null}
                      {r.notes ? <p className="text-xs text-slate-600 mt-2 break-words">{r.notes}</p> : null}
                      {r.driver ? <div className="mt-2 text-xs text-slate-600">Accepted by {r.driver.name}{r.driver.phone ? <> · <a className="text-teal-700 underline" href={`tel:${r.driver.phone}`}>{r.driver.phone}</a></> : null}</div> : null}
                    </div>
                    <span className="text-xs font-semibold px-3 py-1 rounded-full bg-sky-50 text-sky-700 border border-sky-200 shrink-0">
                      {r.status}
                    </span>
                  </div>
                );
              })}
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
