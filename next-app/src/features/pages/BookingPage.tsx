"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from "next/image";
import api, { toursAPI } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { MapPin, Clock, Mail, MessageSquare, CheckCircle, Navigation } from 'lucide-react';
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
  const [sendMethod, setSendMethod] = useState('push');
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

  const sendWhatsApp = async () => {
    const res = await api.post('/send-whatsapp/', {
      ...form,
      tour: tour ? tour.title : 'Custom Tour Inquiry',
      whatsapp_number: '255711252758',
    });
    return res.data;
  };

  const handleSubmit = async (e: FormEvent<HTMLElement>) => {
    e.preventDefault();
    setSending(true);
    let bookingCreated = false;
    try {
      await createBooking();
      bookingCreated = true;
      if (sendMethod === 'whatsapp') {
        const waRes = await sendWhatsApp();
        window.open(waRes.whatsapp_url, '_blank');
      }
      setSuccess(true);
      setTimeout(() => router.push('/bookings'), 3000);
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
        <p>Fill in your details below and Travel. will confirm your reservation with personalized care</p>
      </div>

      {success ? (
        <div className="booking-success-full">
          <span className="success-icon"><CheckCircle size={32} /></span>
          <h2>Booking Submitted Successfully!</h2>
          <p>
            {sendMethod === 'push'
              ? 'Your booking request has been received and our team has been notified. You will get an instant notification with your booking reference, and we will contact you within 24 hours with confirmation and further instructions for your tour.'
              : 'WhatsApp chat has been opened with your booking details with Travel.. Our team at +255711252758 will respond shortly to help plan your perfect experience.'}
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
                  <span className="tour-price-tag">${tour.price} <small>/ person</small></span>
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
              <h2>Personal Information</h2>
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

              <h2>Trip Details</h2>
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

              <h2>Confirmation Method</h2>
              <p className="send-method-label">How would you like to receive your booking confirmation?</p>
              <div className="send-method-options">
                <label className={`send-method-card ${sendMethod === 'push' ? 'selected' : ''}`}>
                  <input type="radio" name="sendMethod" value="push" checked={sendMethod === 'push'} onChange={() => setSendMethod('push')} />
                  <span className="method-icon"><Mail size={24} /></span>
                  <span className="method-label">Send via Notification</span>
                  <span className="method-desc">Get an instant booking notification with your reference number on this device and in your account</span>
                </label>
                <label className={`send-method-card ${sendMethod === 'whatsapp' ? 'selected' : ''}`}>
                  <input type="radio" name="sendMethod" value="whatsapp" checked={sendMethod === 'whatsapp'} onChange={() => setSendMethod('whatsapp')} />
                  <span className="method-icon"><MessageSquare size={24} /></span>
                  <span className="method-label">Send via WhatsApp</span>
                  <span className="method-desc">Open WhatsApp chat with Travel. with your booking details to +255711252758 for quick confirmation</span>
                </label>
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-large" disabled={sending}>
                {sending ? 'Processing...' : `Submit Booking via ${sendMethod === 'push' ? 'Notification' : 'WhatsApp'}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}