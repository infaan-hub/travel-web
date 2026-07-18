import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { TrendingUp, Eye, Users, Globe, MousePointerClick } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';

const COLORS = ['#00D4D8', '#4DEEEA', '#F59E0B', '#EF4444', '#10B981', '#8B5CF6'];

export default function AdminAnalyticsPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) { navigate('/admin/login'); return; }
    Promise.all([
      adminAPI.getStats(),
      adminAPI.getAnalytics(),
    ]).then(([statsRes, analyticsRes]) => {
      setStats(statsRes.data);
      setAnalytics(analyticsRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [isAuthenticated, isAdmin, navigate]);

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

      <div className="charts-grid">
        {tourData.length > 0 && (
          <div className="chart-card">
            <h3><TrendingUp size={18} /> Tours by Category</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={tourData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="name" tick={{ fontSize: 13 }} />
                <YAxis tick={{ fontSize: 13 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,212,216,0.2)', background: 'rgba(255,255,255,0.95)' }} />
                <Bar dataKey="tours" fill="#00D4D8" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {bookingStatusData.length > 0 && (
          <div className="chart-card">
            <h3>Booking Status Distribution</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={bookingStatusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                  {bookingStatusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,212,216,0.2)', background: 'rgba(255,255,255,0.95)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {visitData.length > 0 && (
          <div className="chart-card full-width">
            <h3><Eye size={18} /> Page Views</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={visitData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                <XAxis dataKey="page" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 13 }} />
                <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid rgba(0,212,216,0.2)', background: 'rgba(255,255,255,0.95)' }} />
                <Line type="monotone" dataKey="visits" stroke="#00D4D8" strokeWidth={2} dot={{ fill: '#00D4D8', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
