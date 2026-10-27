"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import api, { toursAPI } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { ClipboardList, MapPin, Users, DollarSign, CalendarDays, CheckCircle, Navigation, Clock, X, ChevronLeft, ChevronRight, Star } from '@/components/icons';
import { getImageUrl } from '@/lib/utils/image-url';

import { useToast } from "@/components/ToastProvider";
import styles from "@/features/pages/company-bookings.module.css";

import type {  Booking  } from "@/features/pages/types";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
function BookingGallery({ tourId, mainImage }: { tourId: number; mainImage: string | null }) {
  const [galleryUrls, setGalleryUrls] = useState<string[]>([]);
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (tourId) {
      toursAPI.getGallery(tourId).then(res => {
        const imgs = res.data.gallery_images || res.data.results || res.data;
        const urls = [];
        if (mainImage) urls.push(mainImage);
        imgs.forEach((img: { image_url?: string | null }) => { if (img.image_url) urls.push(getImageUrl(img.image_url)); });
        setGalleryUrls(urls);
      }).catch(() => {});
    }
  }, [tourId, mainImage]);

  if (!galleryUrls.length) return null;

  return (
    <div className="booking-gallery">
      <div className="gallery-thumbs">
        {galleryUrls.map((url: string, i: number) => (
          <img key={i} src={url} alt="" className={i === current ? 'active' : ''}
            onClick={() => { setCurrent(i); setOpen(true); }} />
        ))}
      </div>
      {open && (
        <div className="gallery-modal" onClick={() => setOpen(false)}>
          <span className="gallery-close-btn" onClick={() => setOpen(false)}><X size={24} /></span>
          <button className="gallery-nav gallery-prev" onClick={(e: MouseEvent<HTMLElement>) => { e.stopPropagation(); setCurrent(c => (c - 1 + galleryUrls.length) % galleryUrls.length); }}><ChevronLeft size={24} /></button>
          <img src={galleryUrls[current]} alt="" onClick={(e: MouseEvent<HTMLElement>) => e.stopPropagation()} />
          <button className="gallery-nav gallery-next" onClick={(e: MouseEvent<HTMLElement>) => { e.stopPropagation(); setCurrent(c => (c + 1) % galleryUrls.length); }}><ChevronRight size={24} /></button>
          <div className="gallery-counter">{current + 1} / {galleryUrls.length}</div>
        </div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  const toast = useToast();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    api.get('/bookings/')
      .then((res: any) => setBookings((res.data.results || res.data) as Booking[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, router]);

  const handleCancel = async (id: number) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        await api.patch(`/bookings/${id}/`, { status: 'cancelled' });
        setBookings(bookings.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
      } catch { toast.error('Failed to cancel booking'); }
    }
  };

  const openGoogleMaps = (booking: Booking) => {
    if (booking.google_maps_url) {
      window.open(booking.google_maps_url, '_blank');
    } else if (booking.user_lat && booking.user_lng && booking.tour_destination_lat && booking.tour_destination_lng) {
      const url = `https://www.google.com/maps/dir/${booking.user_lat},${booking.user_lng}/${booking.tour_destination_lat},${booking.tour_destination_lng}`;
      window.open(url, '_blank');
    } else {
      toast.error('Location data not available for this booking');
    }
  };

  const statusClass = (status: string) => {
    switch (status) {
      case 'confirmed': return 'status-confirmed';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-pending';
    }
  };

  return (
    <div id="bookings-workspace" className={styles.bookingsRoot}>
      <header className={styles.bookingsMasthead}>
        <div className={styles.bookingsMastheadText}>
          <nav className={styles.bookingsBreadcrumb} aria-label="Breadcrumb">
            <Link href="/">Home</Link>
            <span className={styles.bookingsBreadcrumbSep}>/</span>
            <span className={styles.bookingsBreadcrumbCurrent}>My bookings</span>
          </nav>
          <p className={styles.bookingsEyebrow}>Customer bookings</p>
          <h1 className={styles.bookingsTitle}>My booking requests</h1>
          <p className={styles.bookingsLead}>Track requests sent to tourism companies and review their current status.</p>
        </div>
      </header>

      {loading ? (
        <div className={styles.bookingsState}>
          <span className={styles.bookingsStateIcon}><ClipboardList size={22} /></span>
          <h2 className={styles.bookingsStateTitle}>Loading your bookings</h2>
          <p className={styles.bookingsStateCopy}>Please wait while we fetch your booking requests.</p>
        </div>
      ) : bookings.length === 0 ? (
        <div className={styles.bookingsState}>
          <span className={styles.bookingsStateIcon}><ClipboardList size={22} /></span>
          <h2 className={styles.bookingsStateTitle}>No requests yet</h2>
          <p className={styles.bookingsStateCopy}>Your booking requests will appear here after you send one to an experience provider.</p>
          <div className={styles.bookingsStateActions}>
            <button className="btn btn-primary" onClick={() => router.push('/tours/')}>
              Explore experiences
            </button>
          </div>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking: Booking) => (
            <div key={booking.id} className="booking-card-item" onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}>
              <div className="booking-card-image">
                <img
                  src={getImageUrl(booking.tour_image) || ''}
                  alt={booking.tour_title}
                />
              </div>
              <div className="booking-card-content">
                <div className="booking-card-header">
                  <h3>{booking.tour_title}</h3>
                  <span className={`booking-status ${statusClass(booking.status)}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>
                <div className="booking-card-details">
                  <span><CalendarDays size={14} /> Booked: {new Date(booking.created_at ?? 0).toLocaleDateString()}</span>
                  <span><MapPin size={14} /> Travel: {new Date(booking.travel_date).toLocaleDateString()}</span>
                  <span><MapPin size={14} /> {booking.tour_destination}</span>
                  <span><Users size={14} /> Travelers: {booking.travelers}</span>
                  <span><DollarSign size={14} /> Total: ${booking.total_price}</span>
                  {booking.distance_km && <span><Navigation size={14} /> Distance: ~{booking.distance_km} km</span>}
                  {booking.estimated_time_mins && (
                    <span><Clock size={14} /> Est. time: ~{Math.floor(booking.estimated_time_mins / 60)}h {booking.estimated_time_mins % 60}m</span>
                  )}
                </div>

                {expandedId === booking.id && (
                  <div className="booking-expanded">
                    <div className="booking-actions">
                      <button className="btn btn-sm btn-outline" onClick={(e: MouseEvent<HTMLElement>) => { e.stopPropagation(); openGoogleMaps(booking); }}>
                        <Navigation size={14} /> View Route
                      </button>
                      {booking.status === 'pending' && (
                        <button className="btn btn-sm btn-danger" onClick={(e: MouseEvent<HTMLElement>) => { e.stopPropagation(); handleCancel(booking.id); }}>
                          Cancel Booking
                        </button>
                      )}
                      {booking.status === 'confirmed' && (
                        <span className="confirmation-badge"><CheckCircle size={14} /> Booking Confirmed</span>
                      )}
                    </div>
                    <BookingGallery tourId={booking.tour} mainImage={getImageUrl(booking.tour_image)} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
