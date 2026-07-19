import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Globe, ClipboardList, Map, Users, Hourglass, CheckCircle, Palmtree, Compass } from 'lucide-react';

export default function AdminDashboardPage() {
  const { user, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) { navigate('/admin/login'); return; }
    Promise.all([
      api.get('/dashboard/stats/'),
      api.get('/all-bookings/'),
      api.get('/users/'),
    ]).then(([statsRes, bookingsRes, usersRes]) => {
      setStats(statsRes.data);
      setBookings(bookingsRes.data.results || bookingsRes.data);
      setUsers(usersRes.data.results || usersRes.data);
    }).catch(console.error).finally(() => setLoading(false));
  }, [isAuthenticated, isAdmin, navigate]);

  const handleBookingStatus = async (id, status) => {
    try {
      await api.patch(`/bookings/${id}/`, { status });
      setBookings(bookings.map(b => b.id === id ? { ...b, status } : b));
    } catch (err) {
      alert('Failed to update booking status');
    }
  };

  if (!isAuthenticated || !isAdmin) return null;
  if (loading) return <div className="page"><div className="loading">Loading admin dashboard...</div></div>;

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Welcome, {user?.username}! Manage your travel system</p>
      </div>

      {stats && (
        <div className="dashboard-stats-grid">
          <div className="dashboard-stat-card"><span className="stat-icon"><Globe size={24} /></span><span className="stat-value">{stats.total_tours}</span><span className="stat-label">Tours</span></div>
          <div className="dashboard-stat-card"><span className="stat-icon"><ClipboardList size={24} /></span><span className="stat-value">{stats.total_bookings}</span><span className="stat-label">Bookings</span></div>
          <div className="dashboard-stat-card"><span className="stat-icon"><Map size={24} /></span><span className="stat-value">{stats.total_attractions}</span><span className="stat-label">Attractions</span></div>
          <div className="dashboard-stat-card"><span className="stat-icon"><Users size={24} /></span><span className="stat-value">{stats.total_users}</span><span className="stat-label">Users</span></div>
          <div className="dashboard-stat-card pending"><span className="stat-icon"><Hourglass size={24} /></span><span className="stat-value">{stats.pending_bookings}</span><span className="stat-label">Pending</span></div>
          <div className="dashboard-stat-card confirmed"><span className="stat-icon"><CheckCircle size={24} /></span><span className="stat-value">{stats.confirmed_bookings}</span><span className="stat-label">Confirmed</span></div>
          <div className="dashboard-stat-card" style={{borderLeft: '4px solid #3498db'}}><span className="stat-icon"><Palmtree size={24} /></span><span className="stat-value">{stats.zanzibar_tours}</span><span className="stat-label">Zanzibar Tours</span></div>
          <div className="dashboard-stat-card" style={{borderLeft: '4px solid #e67e22'}}><span className="stat-icon"><Compass size={24} /></span><span className="stat-value">{stats.tanzania_tours}</span><span className="stat-label">Infaan Tours</span></div>
        </div>
      )}

      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`admin-tab ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>Bookings</button>
        <button className={`admin-tab ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>Users</button>
      </div>

      <div className="admin-content">
        {activeTab === 'overview' && (
          <div className="overview-welcome">
            <h2>Welcome to Admin Panel</h2>
            <p>From here you can manage all tours, bookings, users, and attractions for your Infaan tours and travel system.</p>
            <div className="overview-links">
              <a href="http://localhost:8000/admin/" target="_blank" className="btn btn-primary" rel="noreferrer">
                Django Admin Panel
              </a>
              <button className="btn btn-outline" onClick={() => navigate('/tours')}>
                View Tours
              </button>
              <button className="btn btn-outline" onClick={() => navigate('/attractions')}>
                View Attractions
              </button>
            </div>
          </div>
        )}

        {activeTab === 'bookings' && (
          <div className="admin-bookings">
            <h2>All Bookings ({bookings.length})</h2>
            {bookings.length === 0 ? (
              <div className="empty-state"><p>No bookings found</p></div>
            ) : (
              <div className="admin-bookings-table">
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Customer</th>
                      <th>Tour</th>
                      <th>Travelers</th>
                      <th>Date</th>
                      <th>Total</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b) => (
                      <tr key={b.id}>
                        <td>#{b.id}</td>
                        <td>
                          <strong>{b.full_name}</strong><br />
                          <small>{b.email}<br />{b.phone}</small>
                        </td>
                        <td>{b.tour_title}</td>
                        <td>{b.travelers}</td>
                        <td>{new Date(b.travel_date).toLocaleDateString()}</td>
                        <td>${b.total_price}</td>
                        <td><span className={`booking-status status-${b.status}`}>{b.status}</span></td>
                        <td>
                          {b.status === 'pending' && (
                            <div className="admin-actions">
                              <button className="btn btn-sm btn-success" onClick={() => handleBookingStatus(b.id, 'confirmed')}>Confirm</button>
                              <button className="btn btn-sm btn-danger" onClick={() => handleBookingStatus(b.id, 'cancelled')}>Cancel</button>
                            </div>
                          )}
                          {b.status === 'confirmed' && (
                            <button className="btn btn-sm btn-danger" onClick={() => handleBookingStatus(b.id, 'cancelled')}>Cancel</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="admin-users">
            <h2>Registered Users ({users.length})</h2>
            <div className="admin-bookings-table">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Staff</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id}>
                      <td>#{u.id}</td>
                      <td><strong>{u.username}</strong></td>
                      <td>{u.email}</td>
                      <td>{u.is_staff ? <span><CheckCircle size={14} /> Admin</span> : <span><Users size={14} /> Customer</span>}</td>
                      <td><a href={`http://localhost:8000/admin/auth/user/${u.id}/change/`} target="_blank" rel="noreferrer" className="btn btn-sm btn-outline">Manage</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
