import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { reviewsAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Star, Search, Trash2, Check, X, BarChart3 } from 'lucide-react';

export default function AdminReviewsPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) { navigate('/admin/login'); return; }
    loadData();
  }, [isAuthenticated, isAdmin, navigate]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [reviewsRes, statsRes] = await Promise.all([
        reviewsAPI.getAll({}),
        reviewsAPI.getStats(),
      ]);
      setReviews(reviewsRes.data.results || reviewsRes.data);
      setStats(statsRes.data);
    } catch { console.error('Failed to load reviews'); }
    finally { setLoading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this review permanently?')) return;
    try {
      await reviewsAPI.delete(id);
      setReviews(reviews.filter(r => r.id !== id));
    } catch { alert('Failed to delete review'); }
  };

  const handleApprove = async (id) => {
    try {
      const res = await reviewsAPI.approve(id, { status: 'approved' });
      setReviews(reviews.map(r => r.id === id ? res.data : r));
    } catch { alert('Failed to approve review'); }
  };

  const handleReject = async (id) => {
    try {
      const res = await reviewsAPI.approve(id, { status: 'deleted' });
      setReviews(reviews.map(r => r.id === id ? res.data : r));
    } catch { alert('Failed to reject review'); }
  };

  const filtered = reviews.filter(r => {
    if (filter === 'approved') return r.status === 'approved';
    if (filter === 'pending') return r.status === 'pending';
    if (filter === 'deleted') return r.status === 'deleted';
    return true;
  }).filter(r =>
    search ? r.user_name?.toLowerCase().includes(search.toLowerCase()) || r.content?.toLowerCase().includes(search.toLowerCase()) || r.tour_title?.toLowerCase().includes(search.toLowerCase()) : true
  );

  if (!isAuthenticated || !isAdmin) return null;
  if (loading) return <div className="page"><div className="loading">Loading reviews...</div></div>;

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1><Star size={20} /> Reviews Management</h1>
        <p>{reviews.length} total reviews</p>
      </div>

      {stats && (
        <div className="stats-grid reviews-stats">
          <div className="stat-card"><span className="stat-number">{stats.total}</span><span className="stat-label">Total</span></div>
          <div className="stat-card"><span className="stat-number">{stats.approved}</span><span className="stat-label">Approved</span></div>
          <div className="stat-card"><span className="stat-number">{stats.pending}</span><span className="stat-label">Pending</span></div>
          <div className="stat-card"><span className="stat-number">{stats.deleted}</span><span className="stat-label">Deleted</span></div>
          <div className="stat-card"><span className="stat-number">{stats.average_rating?.toFixed(1) || 'N/A'}</span><span className="stat-label">Avg Rating</span></div>
        </div>
      )}

      <div className="admin-toolbar">
        <div className="search-input-group">
          <Search size={16} />
          <input type="text" placeholder="Search reviews..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select value={filter} onChange={e => setFilter(e.target.value)} className="filter-select">
          <option value="all">All Reviews</option>
          <option value="approved">Approved</option>
          <option value="pending">Pending</option>
          <option value="deleted">Deleted</option>
        </select>
      </div>

      <div className="admin-content">
        <div className="admin-bookings-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Author</th>
                <th>Rating</th>
                <th>Content</th>
                <th>Tour</th>
                <th>Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="8" className="empty-cell">No reviews found</td></tr>
              ) : filtered.map(r => (
                <tr key={r.id}>
                  <td>#{r.id}</td>
                  <td><strong>{r.user_name}</strong></td>
                  <td>
                    <span className="review-stars">
                      {Array.from({ length: r.rating }, (_, i) => <Star key={i} size={14} fill="#f59e0b" color="#f59e0b" />)}
                    </span>
                  </td>
                  <td className="tip-cell">{r.content?.substring(0, 80)}{r.content?.length > 80 ? '...' : ''}</td>
                  <td>{r.tour_title || '-'}</td>
                  <td>{new Date(r.created_at).toLocaleDateString()}</td>
                  <td>
                    {r.status === 'approved' ? <span className="status-badge status-confirmed">Approved</span> :
                     r.status === 'deleted' ? <span className="status-badge status-cancelled">Deleted</span> :
                     <span className="status-badge status-pending">Pending</span>}
                  </td>
                  <td>
                    <div className="admin-actions">
                      {r.status === 'pending' && (
                        <>
                          <button className="btn btn-sm btn-outline" title="Approve" onClick={() => handleApprove(r.id)}>
                            <Check size={14} />
                          </button>
                          <button className="btn btn-sm btn-danger" title="Reject" onClick={() => handleReject(r.id)}>
                            <X size={14} />
                          </button>
                        </>
                      )}
                      <button className="btn btn-sm btn-danger" title="Delete" onClick={() => handleDelete(r.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
