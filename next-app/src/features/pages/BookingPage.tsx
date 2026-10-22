"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from "next/image";
import api, { toursAPI } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { MapPin, Clock, Mail, CheckCircle, Navigation, Building2 } from '@/components/icons';
import { getImageUrl } from '@/lib/utils/image-url';

import { useToast } from "@/components/ToastProvider";

import type {  Tour  } from "@/features/pages/types";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function BookingPage() {
  const toast = useToast();
  const { tourId } = useParams<Record<string, string>>();
  const router = useRouter();
  const { user, isAuthenticated, loading: authLoading } = useAuth();
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
    if (authLoading) return;
    // Guests can book without an account; signed-in customers are prefilled.
    if (user) {
      // Prefill the form for signed-in customers.
      queueMicrotask(() =>
        setForm(prev => ({
          ...prev,
          full_name: user.username || '',
          email: user.email || '',
        })),
      );
    }
    if (tourId) {
      toursAPI.getById(tourId)
        .then((res: any) => setTour(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos: any) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
        },
        () => console.log('Geolocation not available'),
        { timeout: 10000 }
      );
    }
  }, [tourId, user, isAuthenticated, router]);

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

  if (loading) return <div className="page"><div className="loading">Loading tour details...</div></div>;

  return (
    <div className="page booking-page">
      <div className="page-header">
        <h1>{tour ? `Book: ${tour.title}` : 'Book a Tour'}</h1>
          <p>Send a booking request to the company that offers this experience. They will follow up about availability and next steps.</p>
      </div>

      {success ? (
        <div className="booking-success-full">
          <span className="success-icon"><CheckCircle size={32} /></span>
          <h2>Booking Submitted Successfully!</h2>
          <p>
            {tour?.company_name
              ? `Your request has been recorded for ${tour.company_name}. The provider will follow up about availability and next steps.`
              : 'Your request has been recorded. The provider will follow up about availability and next steps.'}
          </p>
          <div className="success-actions">
            <button className="btn btn-primary" onClick={() => router.push('/bookings')}>
              View My Bookings
            </button>
            <button className="btn btn-outline" onClick={() => router.push('/')}>
              Back to Home
            </button>
          </div>
        </div>
      ) : (
        <div className="booking-form-wrapper">
          <div className="booking-form-container">
            {tour && (
              <div className="booking-tour-summary">
                <Image src={getImageUrl(tour.image_url) || ''} alt={tour.title} width={480} height={320} />
                <div className="booking-tour-info">
                  <h3>{tour.title}</h3>
                  <span className="tour-destination"><MapPin size={16} /> {tour.destination}</span>
                  <span className="tour-duration"><Clock size={16} /> {tour.duration}</span>
                  <span className="tour-price-tag">From ${tour.price} <small>/ person</small></span>
                  {tour.company_name && tour.company_public_path ? (
                    <Link className="tour-company-link" href={tour.company_public_path}>
                      <Building2 size={14} /> {tour.company_name}
                    </Link>
                  ) : null}
                  {distance && (
                    <div className="booking-distance-info">
                      <span><Navigation size={14} /> Distance: ~{distance} km</span>
                      {estimatedTime && <span>Estimated time: ~{Math.floor(estimatedTime / 60)}h {estimatedTime % 60}m</span>}
                    </div>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="booking-form-detailed">
              <h2>Your details</h2>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input type="text" name="full_name" value={form.full_name} onChange={handleChange} required placeholder="Your full name" />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="your@email.com" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone *</label>
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} required placeholder="+255 7XX XXX XXX" />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input type="text" name="address" value={form.address} onChange={handleChange} placeholder="Your address" />
                </div>
              </div>

              <h2>Group and travel date</h2>
              <div className="form-row">
                <div className="form-group">
                  <label>Number of Adults *</label>
                  <input type="number" name="travelers" min="1" max="50" value={form.travelers} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Number of Children</label>
                  <input type="number" name="children" min="0" max="20" value={form.children} onChange={handleChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Travel Date *</label>
                  <input type="date" name="travel_date" value={form.travel_date} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>Special Requests / Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows={4} placeholder="Hotel preferences, dietary requirements, special occasions..." />
              </div>

              <div className="booking-request-note">
                <Mail size={18} />
                <span>This is a request, not a confirmed booking. The selected company will contact you to discuss availability.</span>
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-large" disabled={sending}>
                {sending ? 'Sending request…' : 'Send booking request'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
