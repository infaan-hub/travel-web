"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";
import Image from "next/image";
import api, { toursAPI } from "@/lib/api/client";
import { useAuth } from "@/context/AuthContext";
import {
  ArrowRight,
  Building2,
  Calendar,
  CheckCircle,
  Clock,
  Mail,
  MapPin,
  Navigation,
  Send,
  User,
  Users,
} from "@/components/icons";
import { getImageUrl } from "@/lib/utils/image-url";

import { useToast } from "@/components/ToastProvider";

import type { Tour } from "@/features/pages/types";
import type { ChangeEvent, FormEvent } from "react";
import styles from "@/features/pages/booking-page.module.css";

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatTravelDate(value: string) {
  if (!value) return "To be confirmed";
  const parsed = new Date(`${value}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function BookingPage() {
  const toast = useToast();
  const { tourId } = useParams<Record<string, string>>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [tour, setTour] = useState<Tour | null>(null);
  const [loading, setLoading] = useState(!!tourId);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [estimatedTime, setEstimatedTime] = useState<number | null>(null);
  const [mapsUrl, setMapsUrl] = useState('');
  const [form, setForm] = useState<{
    full_name: string;
    email: string;
    phone: string;
    address: string;
    travelers: number;
    children: number;
    travel_date: string;
    notes: string;
  }>({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    travelers: 1,
    children: 0,
    travel_date: '',
    notes: '',
  });

  useEffect(() => {
    if (!tourId) return;
    toursAPI.getById(tourId)
      .then((res: any) => setTour(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [tourId]);

  useEffect(() => {
    if (authLoading || !user) return;
    // Prefill the form for signed-in customers without overwriting input they
    // have already typed if the auth context refreshes.
    queueMicrotask(() =>
      setForm(prev => ({
        ...prev,
        full_name: prev.full_name || user.username || '',
        email: prev.email || user.email || '',
      })),
    );
  }, [user, authLoading]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos: any) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(loc);
      },
      () => console.log('Geolocation not available'),
      { timeout: 10000 }
    );
  }, []);

  useEffect(() => {
    if (!success) return;
    // The form is taller than the confirmation, so a submit from the bottom
    // would otherwise leave the new card scrolled out of view.
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? "auto" : "smooth" });
  }, [success]);

  useEffect(() => {
    if (userLocation && tour?.destination_lat && tour?.destination_lng) {
      const dist = haversineDistance(userLocation.lat, userLocation.lng, tour.destination_lat, tour.destination_lng);
      const time = Math.round(dist / 50 * 60);
      const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${tour.destination_lat},${tour.destination_lng}`;
      queueMicrotask(() => {
        setDistance(Math.round(dist * 10) / 10);
        setEstimatedTime(time);
        setMapsUrl(url);
      });
    }
  }, [userLocation, tour]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  const createBooking = async () => {
    if (tour) {
      const bookingData = {
        ...form,
        tour: tour.id,
        user_lat: userLocation?.lat || null,
        user_lng: userLocation?.lng || null,
        distance_km: distance || null,
        estimated_time_mins: estimatedTime || null,
        google_maps_url: mapsUrl || '',
        session_id: (typeof window !== 'undefined' && window.localStorage.getItem('session_id')) || undefined,
      };
      await api.post('/bookings/', bookingData);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLElement>) => {
    e.preventDefault();
    setSending(true);
    let bookingCreated = false;
    try {
      await createBooking();
      bookingCreated = true;
      setSuccess(true);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || '';
      if (bookingCreated) {
        const userMsg = msg
          ? `Booking saved! But ${msg.toLowerCase()}. We will contact you soon.`
          : 'Booking saved! The notification could not be sent. We will contact you soon.';
        toast.error(userMsg);
        router.push('/bookings');
      } else {
        toast.error(msg || 'Failed to process booking. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className={`page ${styles.page}`} id="booking-page-root">
        <div className={styles.loading} role="status">Loading tour details...</div>
      </div>
    );
  }

  const adults = Number(form.travelers) || 0;
  const children = Number(form.children) || 0;
  const guestLabel = `${adults} adult${adults === 1 ? "" : "s"}${children > 0
    ? `, ${children} child${children === 1 ? "" : "ren"}`
    : ""}`;
  const requestedBy = form.full_name || user?.username || "Guest traveller";
  const contactEmail = form.email || user?.email || "the email you provided";
  const tourImageSource = tour ? tour.image_url || tour.main_image_url : null;
  const tourImage = tourImageSource ? getImageUrl(tourImageSource) : null;
  const successMessage = tour?.company_name
    ? `Your request has been recorded for ${tour.company_name}. The provider will follow up about availability and next steps.`
    : 'Your request has been recorded. The provider will follow up about availability and next steps.';

  return (
    <div className={`page ${styles.page}`} id="booking-page-root">
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <span className={styles.eyebrow}>
            <Send size={13} aria-hidden="true" />
            Booking request
          </span>
          <h1 className={styles.heroTitle}>{tour ? `Book: ${tour.title}` : 'Book a Tour'}</h1>
          <p>Send a booking request to the company that offers this experience. They will follow up about availability and next steps.</p>
        </div>
        <div className={styles.heroFacts} aria-label="How booking works">
          <span className={styles.heroFact}>
            <Send size={15} aria-hidden="true" />
            <span>Request only — no confirmation yet</span>
          </span>
          <span className={styles.heroFact}>
            <Mail size={15} aria-hidden="true" />
            <span>The provider follows up with you</span>
          </span>
        </div>
      </header>

      {success ? (
        <section className={styles.successWrap} aria-live="polite">
          <div className={styles.successCard}>
            <span className={styles.successIcon}>
              <CheckCircle size={34} aria-hidden="true" />
            </span>
            <span className={styles.successEyebrow}>Request received</span>
            <h2 className={styles.successTitle}>Booking Submitted Successfully!</h2>
            <p className={styles.successLead}>{successMessage}</p>

            <div className={`${styles.successSummary} ${!tour ? styles.successSummarySolo : ""}`}>
              {tour && (
                <div className={styles.successTour}>
                  {tourImage && (
                    <div className={styles.successThumb}>
                      <Image
                        src={tourImage}
                        alt=""
                        fill
                        sizes="78px"
                        className={styles.successThumbEl}
                      />
                    </div>
                  )}
                  <div className={styles.successTourInfo}>
                    <strong>{tour.title}</strong>
                    <span><MapPin size={12} aria-hidden="true" />{tour.destination}</span>
                    <span><Clock size={12} aria-hidden="true" />{tour.duration}</span>
                  </div>
                </div>
              )}
              <div className={styles.successFacts}>
                <div className={styles.successFact}>
                  <span><Calendar size={11} aria-hidden="true" />Travel date</span>
                  <strong>{formatTravelDate(form.travel_date)}</strong>
                </div>
                <div className={styles.successFact}>
                  <span><Users size={11} aria-hidden="true" />Guests</span>
                  <strong>{guestLabel}</strong>
                </div>
                <div className={styles.successFact}>
                  <span><User size={11} aria-hidden="true" />Requested by</span>
                  <strong>{requestedBy}</strong>
                </div>
                <div className={styles.successFact}>
                  <span><Mail size={11} aria-hidden="true" />Contact</span>
                  <strong>{form.email || user?.email || "—"}</strong>
                </div>
              </div>
            </div>

            <div className={styles.successNote}>
              <Mail size={16} aria-hidden="true" />
              <p>The provider will contact you at <strong>{contactEmail}</strong> to confirm availability and next steps.</p>
            </div>

            <div className={styles.successActions}>
              <button
                type="button"
                className={styles.primaryAction}
                onClick={() => router.push('/bookings')}
              >
                View My Bookings
                <ArrowRight size={16} aria-hidden="true" />
              </button>
              <button
                type="button"
                className={styles.secondaryAction}
                onClick={() => router.push('/')}
              >
                Back to Home
              </button>
            </div>
          </div>
        </section>
      ) : (
        <form onSubmit={handleSubmit} className={styles.layout}>
          <div className={styles.main}>
            <section className={styles.card} aria-labelledby="booking-details-title">
              <div className={styles.cardHeader}>
                <span className={styles.cardIcon}><User size={18} aria-hidden="true" /></span>
                <div>
                  <h2 id="booking-details-title">Your details</h2>
                  <p>So the provider knows who is travelling and how to reach you.</p>
                </div>
              </div>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label htmlFor="booking-full-name">Full Name *</label>
                  <input
                    id="booking-full-name"
                    type="text"
                    name="full_name"
                    value={form.full_name}
                    onChange={handleChange}
                    required
                    placeholder="Your full name"
                    autoComplete="name"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="booking-email">Email *</label>
                  <input
                    id="booking-email"
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder="your@email.com"
                    autoComplete="email"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="booking-phone">Phone *</label>
                  <input
                    id="booking-phone"
                    type="tel"
                    name="phone"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    placeholder="+255 7XX XXX XXX"
                    autoComplete="tel"
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="booking-address">Address</label>
                  <input
                    id="booking-address"
                    type="text"
                    name="address"
                    value={form.address}
                    onChange={handleChange}
                    placeholder="Your address"
                    autoComplete="street-address"
                  />
                </div>
              </div>
            </section>

            <section className={styles.card} aria-labelledby="booking-group-title">
              <div className={styles.cardHeader}>
                <span className={styles.cardIcon}><Users size={18} aria-hidden="true" /></span>
                <div>
                  <h2 id="booking-group-title">Group and travel date</h2>
                  <p>Tell the provider who is coming and when you would like to travel.</p>
                </div>
              </div>
              <div className={styles.fieldGrid}>
                <div className={styles.field}>
                  <label htmlFor="booking-adults">Number of Adults *</label>
                  <input
                    id="booking-adults"
                    type="number"
                    name="travelers"
                    min="1"
                    max="50"
                    value={form.travelers}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={styles.field}>
                  <label htmlFor="booking-children">Number of Children</label>
                  <input
                    id="booking-children"
                    type="number"
                    name="children"
                    min="0"
                    max="20"
                    value={form.children}
                    onChange={handleChange}
                  />
                </div>
                <div className={`${styles.field} ${styles.fieldWide}`}>
                  <label htmlFor="booking-travel-date">Travel Date *</label>
                  <input
                    id="booking-travel-date"
                    type="date"
                    name="travel_date"
                    value={form.travel_date}
                    onChange={handleChange}
                    required
                  />
                </div>
                <div className={`${styles.field} ${styles.fieldWide}`}>
                  <label htmlFor="booking-notes">Special Requests / Notes</label>
                  <textarea
                    id="booking-notes"
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Hotel preferences, dietary requirements, special occasions..."
                  />
                </div>
              </div>
            </section>

            <div className={styles.requestNote}>
              <span className={styles.noteIcon}><Mail size={16} aria-hidden="true" /></span>
              <div>
                <strong>This is a request, not a confirmed booking.</strong>
                <p>The selected company will contact you to discuss availability.</p>
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitAction}
              disabled={sending}
              aria-busy={sending}
            >
              {sending ? 'Sending request…' : 'Send booking request'}
              {!sending && <Send size={17} aria-hidden="true" />}
            </button>
            <p className={styles.formFootnote}>Sending this form does not confirm the booking. The provider will confirm availability with you.</p>
          </div>

          <aside className={styles.aside}>
            {tour && (
              <section className={styles.tourCard} aria-labelledby="booking-tour-title">
                <div className={styles.tourImage}>
                  {tourImage ? (
                    <Image
                      src={tourImage}
                      alt={tour.title}
                      fill
                      sizes="(max-width: 980px) 100vw, 340px"
                      className={styles.tourImageEl}
                    />
                  ) : (
                    <span className={styles.tourImageFallback}><MapPin size={28} aria-hidden="true" /></span>
                  )}
                  <span className={styles.imageBadge}>
                    <Send size={11} aria-hidden="true" />
                    Request
                  </span>
                </div>
                <div className={styles.tourBody}>
                  <p className={styles.tourEyebrow}>You&apos;re requesting</p>
                  <h2 id="booking-tour-title" className={styles.tourTitle}>{tour.title}</h2>
                  <div className={styles.tourMeta}>
                    <span><MapPin size={15} aria-hidden="true" />{tour.destination}</span>
                    <span><Clock size={15} aria-hidden="true" />{tour.duration}</span>
                  </div>
                  <div className={styles.priceRow}>
                    <strong>${tour.price}</strong>
                    <span>per person</span>
                  </div>
                  {tour.company_name && tour.company_public_path ? (
                    <Link className={styles.companyLink} href={tour.company_public_path}>
                      <Building2 size={14} aria-hidden="true" />
                      <span>Operated by {tour.company_name}</span>
                    </Link>
                  ) : null}
                  {distance !== null && (
                    <div className={styles.distanceInfo}>
                      <span><Navigation size={13} aria-hidden="true" />~{distance} km from you</span>
                      {estimatedTime !== null && (
                        <span><Clock size={13} aria-hidden="true" />Estimated travel time ~{Math.floor(estimatedTime / 60)}h {estimatedTime % 60}m</span>
                      )}
                    </div>
                  )}
                </div>
              </section>
            )}

            <section className={styles.nextCard} aria-label="What happens next">
              <h2>What happens next?</h2>
              <ol className={styles.steps}>
                <li>
                  <span className={styles.stepNumber}>1</span>
                  <div className={styles.stepCopy}>
                    <strong>The provider checks availability</strong>
                    <p>They review your dates, group size and any special requests.</p>
                  </div>
                </li>
                <li>
                  <span className={styles.stepNumber}>2</span>
                  <div className={styles.stepCopy}>
                    <strong>They contact you</strong>
                    <p>Look out for an email or phone call about the next steps.</p>
                  </div>
                </li>
                <li>
                  <span className={styles.stepNumber}>3</span>
                  <div className={styles.stepCopy}>
                    <strong>You confirm the details</strong>
                    <p>Nothing is paid on this page, and your dates are not held yet.</p>
                  </div>
                </li>
              </ol>
            </section>
          </aside>
        </form>
      )}
    </div>
  );
}
