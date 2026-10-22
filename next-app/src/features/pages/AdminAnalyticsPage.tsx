"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { adminAPI } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { TrendingUp, Eye, Users, Globe, MousePointerClick } from '@/components/icons';

import type {  Analytics, DashboardStats  } from "@/features/pages/types";
const AnalyticsCharts = dynamic(() => import('./AnalyticsCharts'), {
  ssr: false,
  loading: () => <div className="loading">Loading charts...</div>,
});

export default function AdminAnalyticsPage() {
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) { router.push('/admin/login'); return; }
    Promise.all([
      adminAPI.getStats(),
      adminAPI.getAnalytics(),
    ]).then(([statsRes, analyticsRes]) => {
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [authLoading, isAuthenticated, isAdmin, router]);

  if (!isAuthenticated || !isAdmin) return null;
  if (loading) return <div className="page"><div className="loading">Loading analytics...</div></div>;

  const tourData = stats ? [
    { name: 'Zanzibar', tours: stats.zanzibar_tours || 0 },
    { name: 'Tanzania', tours: stats.tanzania_tours || 0 },
  ] : [];

  const bookingStatusData = stats ? [
    { name: 'Pending', value: stats.pending_bookings || 0 },
    { name: 'Confirmed', value: stats.confirmed_bookings || 0 },
    { name: 'Cancelled', value: stats.cancelled_bookings || 0 },
  ].filter(d => d.value > 0) : [];

  const visitData = analytics?.page_views ? Object.entries(analytics.page_views).map(([page, count]) => ({ page: page.split('/').filter(Boolean).join('/') || 'home', visits: count })) : [];

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1>Analytics</h1>
        <p>Visitor insights and platform metrics</p>
      </div>

      {analytics && (
        <div className="dashboard-stats-grid">
          <div className="dashboard-stat-card">
            <span className="stat-icon"><Eye size={24} /></span>
            <span className="stat-value">{analytics.total_visits || 0}</span>
            <span className="stat-label">Total Visits</span>
          </div>
          <div className="dashboard-stat-card">
            <span className="stat-icon"><Users size={24} /></span>
            <span className="stat-value">{analytics.unique_visitors || 0}</span>
            <span className="stat-label">Unique Visitors</span>
          </div>
          <div className="dashboard-stat-card">
            <span className="stat-icon"><MousePointerClick size={24} /></span>
            <span className="stat-value">{analytics.average_visits_per_user || 0}</span>
            <span className="stat-label">Avg Visits/User</span>
          </div>
          {stats && (
            <div className="dashboard-stat-card">
              <span className="stat-icon"><Globe size={24} /></span>
              <span className="stat-value">{stats.total_tours}</span>
              <span className="stat-label">Total Tours</span>
            </div>
          )}
        </div>
      )}

      <AnalyticsCharts
        tourData={tourData}
        bookingStatusData={bookingStatusData}
        visitData={visitData}
      />
    </div>
  );
}
