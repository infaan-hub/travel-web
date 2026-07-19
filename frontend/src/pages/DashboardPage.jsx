import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, Hourglass, CheckCircle, CalendarDays, MapPin, Users, DollarSign, Palmtree, Compass, Map, Mail, ArrowRight } from 'lucide-react';

export default function DashboardPage() {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); return; }
    api.get('/dashboard/')
      .then((res) => setData(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated, navigate]);

  if (!isAuthenticated) return null;
  if (loading) return <div className="page"><div className="loading">Loading dashboard...</div></div>;

  return (
    <div className="page dashboard-page">
      <div className="page-header">
        <h1>Welcome, {user?.username}!</h1>
        <p>Your Infaan tours and travel dashboard - manage your bookings and explore more adventures</p>
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
        <div className="dashboard-stat-card action" onClick={() => navigate('/booking')}>
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
          {data?.recent_bookings?.length > 0 ? (
            <div className="recent-bookings">
              {data.recent_bookings.map((booking) => (
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
              <p>No bookings yet. Start planning your adventure!</p>
              <button className="btn btn-primary" onClick={() => navigate('/tours')}>Browse Tours</button>
            </div>
          )}
        </div>

        <div className="dashboard-section quick-links">
          <div className="section-header">
            <h2>Quick Actions</h2>
          </div>
          <div className="quick-links-grid">
            <div className="quick-link-card" onClick={() => navigate('/tours/zanzibar')}>
              <span className="ql-icon"><Palmtree size={24} /></span>
              <span>Zanzibar Tours</span>
            </div>
            <div className="quick-link-card" onClick={() => navigate('/tours/tanzania')}>
              <span className="ql-icon"><Compass size={24} /></span>
              <span>Tanzania Safaris</span>
            </div>
            <div className="quick-link-card" onClick={() => navigate('/attractions')}>
              <span className="ql-icon"><Map size={24} /></span>
              <span>Attractions</span>
            </div>
            <div className="quick-link-card" onClick={() => navigate('/contact')}>
              <span className="ql-icon"><Mail size={24} /></span>
              <span>Contact Us</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
