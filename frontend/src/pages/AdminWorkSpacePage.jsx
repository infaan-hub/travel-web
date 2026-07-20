import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { adminAPI, workspacesAPI } from '../api/axios';
import { Users, Search, X, ChevronRight, Plus, Briefcase } from 'lucide-react';

export default function AdminWorkSpacePage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tourists, setTourists] = useState([]);
  const [workspaces, setWorkspaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedTourist, setSelectedTourist] = useState(null);
  const [touristBookings, setTouristBookings] = useState([]);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerForm, setRegisterForm] = useState({
    username: '', email: '', password: '', full_name: '', phone: '', arrival_date: '', departure_date: ''
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) { navigate('/admin/login'); return; }
    loadData();
  }, [isAuthenticated, isAdmin, navigate]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      adminAPI.getAllUsers().catch(() => ({ data: [] })),
      workspacesAPI.getAll().catch(() => ({ data: [] })),
    ]).then(([usersRes, wsRes]) => {
      const users = usersRes.data?.results || usersRes.data || [];
      const ws = wsRes.data?.results || wsRes.data || [];
      const filtered = Array.isArray(users) ? users.filter(u => !u.is_staff) : [];
      setTourists(filtered);
      setWorkspaces(Array.isArray(ws) ? ws : []);
    }).finally(() => setLoading(false));
  };

  const loadTouristBookings = async (userId) => {
    try {
      const res = await adminAPI.getAllBookings();
      const bookings = res.data?.results || res.data || [];
      const userBookings = Array.isArray(bookings) ? bookings.filter(b => b.user === userId || b.email === selectedTourist?.email) : [];
      setTouristBookings(userBookings);
    } catch {
      setTouristBookings([]);
    }
  };

  const selectTourist = (tourist) => {
    setSelectedTourist(tourist);
    loadTouristBookings(tourist.id);
    setSearch('');
  };

  const startPlanning = () => {
    if (!selectedTourist) return;
    const existingWs = workspaces.find(w => w.tourist_id === selectedTourist.id);
    if (existingWs) {
      navigate(`/admin/work-space/tour-plan/${existingWs.id}`);
    } else {
      navigate(`/admin/work-space/tour-plan/new?tourist=${selectedTourist.id}&name=${encodeURIComponent(selectedTourist.username)}&email=${encodeURIComponent(selectedTourist.email)}`);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await adminAPI.getAllUsers();
      const users = res.data?.results || res.data || [];
      const exists = Array.isArray(users) && users.find(u => u.email === registerForm.email);
      if (exists) {
        alert('A user with this email already exists. Please select them from the list.');
        setShowRegisterForm(false);
        return;
      }
      alert('Tourist registered successfully! Please add the corresponding backend endpoint or use the existing user registration.');
      setShowRegisterForm(false);
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Registration failed');
    } finally {
      setSaving(false);
    }
  };

  if (!isAuthenticated || !isAdmin) return null;

  const filtered = tourists.filter(t =>
    t.username?.toLowerCase().includes(search.toLowerCase()) ||
    t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1>Workspace</h1>
        <p>Select a tourist to plan their tour itinerary</p>
      </div>

      <div className="admin-toolbar">
        <div className="search-input-group">
          <Search size={16} />
          <input type="text" placeholder="Search tourists by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="search-clear" onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        <button className="btn btn-primary" onClick={() => setShowRegisterForm(true)}>
          <Plus size={16} /> Register Tourist
        </button>
      </div>

      <div className="workspace-layout">
        <div className="workspace-sidebar">
          <h3>Tourists ({filtered.length})</h3>
          {loading ? <div className="loading">Loading...</div> : (
            <div className="tourist-list">
              {filtered.length === 0 ? (
                <p className="empty-text">No tourists found</p>
              ) : filtered.map(tourist => (
                <div
                  key={tourist.id}
                  className={`tourist-card ${selectedTourist?.id === tourist.id ? 'selected' : ''}`}
                  onClick={() => selectTourist(tourist)}
                >
                  <div className="tourist-avatar">
                    {tourist.profile_image_url ? (
                      <img src={tourist.profile_image_url} alt="" />
                    ) : (
                      tourist.username?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                  <div className="tourist-info">
                    <span className="tourist-name">{tourist.username}</span>
                    <span className="tourist-email">{tourist.email}</span>
                  </div>
                  <ChevronRight size={16} className="tourist-arrow" />
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="workspace-main">
          {selectedTourist ? (
            <div className="workspace-detail">
              <div className="tourist-profile-header">
                <div className="tourist-avatar large">
                  {selectedTourist.profile_image_url ? (
                    <img src={selectedTourist.profile_image_url} alt="" />
                  ) : (
                    selectedTourist.username?.[0]?.toUpperCase() || '?'
                  )}
                </div>
                <div className="tourist-meta">
                  <h2>{selectedTourist.username}</h2>
                  <p><span className="meta-label">Email:</span> {selectedTourist.email}</p>
                  <p><span className="meta-label">Joined:</span> {new Date(selectedTourist.date_joined).toLocaleDateString()}</p>
                </div>
              </div>

              <div className="workspace-bookings">
                <h3>Bookings</h3>
                {touristBookings.length === 0 ? (
                  <p className="empty-text">No bookings found for this tourist</p>
                ) : (
                  <div className="bookings-mini-list">
                    {touristBookings.map(booking => (
                      <div key={booking.id} className="booking-mini-card">
                        <div className="booking-mini-icon"><Briefcase size={18} /></div>
                        <div className="booking-mini-info">
                          <span className="booking-mini-title">{booking.tour_title || 'Tour'}</span>
                          <span className="booking-mini-date">{new Date(booking.travel_date).toLocaleDateString()} · {booking.travelers} traveler(s)</span>
                        </div>
                        <span className={`booking-mini-status ${booking.status}`}>{booking.status}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <button className="btn btn-primary btn-large btn-block" onClick={startPlanning}>
                <Briefcase size={18} /> Start Planning
              </button>
            </div>
          ) : (
            <div className="workspace-empty">
              <Users size={48} />
              <h3>Select a Tourist</h3>
              <p>Choose a tourist from the list to start planning their tour itinerary</p>
            </div>
          )}
        </div>
      </div>

      {showRegisterForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowRegisterForm(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Register New Tourist</h3>
              <button className="modal-close" onClick={() => setShowRegisterForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label>Username</label>
                <input type="text" required value={registerForm.username} onChange={e => setRegisterForm({ ...registerForm, username: e.target.value })} placeholder="Username" />
              </div>
              <div className="form-group">
                <label>Email</label>
                <input type="email" required value={registerForm.email} onChange={e => setRegisterForm({ ...registerForm, email: e.target.value })} placeholder="Email address" />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input type="password" required value={registerForm.password} onChange={e => setRegisterForm({ ...registerForm, password: e.target.value })} placeholder="Password" />
              </div>
              <div className="form-group">
                <label>Full Name</label>
                <input type="text" value={registerForm.full_name} onChange={e => setRegisterForm({ ...registerForm, full_name: e.target.value })} placeholder="Full name" />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" value={registerForm.phone} onChange={e => setRegisterForm({ ...registerForm, phone: e.target.value })} placeholder="Phone number" />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Arrival Date</label>
                  <input type="date" value={registerForm.arrival_date} onChange={e => setRegisterForm({ ...registerForm, arrival_date: e.target.value })} />
                </div>
                <div className="form-group">
                  <label>Departure Date</label>
                  <input type="date" value={registerForm.departure_date} onChange={e => setRegisterForm({ ...registerForm, departure_date: e.target.value })} />
                </div>
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={saving}>
                {saving ? 'Saving...' : 'Register Tourist'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
