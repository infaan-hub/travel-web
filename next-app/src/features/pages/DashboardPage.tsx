"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import api from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { ClipboardList, Hourglass, CheckCircle, CalendarDays, MapPin, Users, DollarSign, Palmtree, Compass, Map, Mail, ArrowRight } from '@/components/icons';

import type {  CustomerDashboard, Booking  } from "@/features/pages/types";
export default function DashboardPage() {
  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<CustomerDashboard | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    api.get('/dashboard/')
      .then((res: any) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, router]);

  if (!isAuthenticated) return null;
  if (loading) return <div className="page"><div className="loading">Loading dashboard...</div></div>;

  return (
    <div className="page dashboard-page">
      <div className="page-header">
        <h1>Welcome, {user?.username}!</h1>
        <p>Track your booking requests and explore experiences from participating companies.</p>
      </div>

      <div className="dashboard-stats-grid">
        <div className="dashboard-stat-card">
          <span className="stat-icon"><ClipboardList size={24} /></span>
          <span className="stat-value">{data?.total_bookings || 0}</span>
          <span className="stat-label">Total Bookings</span>
        </div>
        <div className="dashboard-stat-card pending">
          <span className="stat-icon"><Hourglass size={24} /></span>
          <span className="stat-value">{data?.pending_bookings || 0}</span>
          <span className="stat-label">Pending</span>
        </div>
        <div className="dashboard-stat-card confirmed">
          <span className="stat-icon"><CheckCircle size={24} /></span>
          <span className="stat-value">{data?.confirmed_bookings || 0}</span>
          <span className="stat-label">Confirmed</span>
        </div>
        <div className="dashboard-stat-card action" onClick={() => router.push('/booking')}>
          <span className="stat-icon"><CalendarDays size={24} /></span>
          <span className="stat-value">Book Now</span>
          <span className="stat-label">Plan a new trip <ArrowRight size={14} /></span>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="dashboard-section">
          <div className="section-header">
            <h2>Recent Bookings</h2>
          </div>
          {data?.recent_bookings && data.recent_bookings.length > 0 ? (
            <div className="recent-bookings">
              {(data.recent_bookings ?? []).map((booking: Booking) => (
                <div key={booking.id} className="recent-booking-item">
                  <div className="recent-booking-info">
                    <h3>{booking.tour_title}</h3>
                    <span><CalendarDays size={14} /> {new Date(booking.travel_date).toLocaleDateString()}</span>
                    <span><Users size={14} /> {booking.travelers} travelers</span>
                    <span><DollarSign size={14} /> ${booking.total_price}</span>
                  </div>
                  <span className={`booking-status status-${booking.status}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state small">
              <p>Your booking requests will appear here. Explore experiences when you are ready to plan.</p>
              <button className="btn btn-primary" onClick={() => router.push('/tours/')}>Explore experiences</button>
            </div>
          )}
        </div>

        <div className="dashboard-section quick-links">
          <div className="section-header">
            <h2>Quick Actions</h2>
          </div>
          <div className="quick-links-grid">
            <Link className="quick-link-card" href="/tours/zanzibar/">
              <span className="ql-icon"><Palmtree size={24} /></span>
              <span>Zanzibar experiences</span>
            </Link>
            <Link className="quick-link-card" href="/tours/tanzania/">
              <span className="ql-icon"><Compass size={24} /></span>
              <span>Tanzania safaris</span>
            </Link>
            <Link className="quick-link-card" href="/companies/">
              <span className="ql-icon"><Users size={24} /></span>
              <span>Tourism companies</span>
            </Link>
            <Link className="quick-link-card" href="/attractions/">
              <span className="ql-icon"><Map size={24} /></span>
              <span>Places</span>
            </Link>
            <Link className="quick-link-card" href="/contact/">
              <span className="ql-icon"><Mail size={24} /></span>
              <span>Contact Travel.</span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
