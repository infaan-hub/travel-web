import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Users, UserX, Shield, User, Search, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminCustomersPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 10;

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) { navigate('/admin/login'); return; }
    adminAPI.getAllUsers()
      .then(res => setUsers(res.data.results || res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated, isAdmin, navigate]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return;
    try {
      await adminAPI.deleteUser(id);
      setUsers(users.filter(u => u.id !== id));
    } catch { alert('Failed to delete user'); }
  };

  if (!isAuthenticated || !isAdmin) return null;
  if (loading) return <div className="page"><div className="loading">Loading customers...</div></div>;

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice((page - 1) * perPage, page * perPage);

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1>Customers</h1>
        <p>Manage registered users ({users.length} total)</p>
      </div>

      <div className="admin-toolbar">
        <div className="search-input-group">
          <Search size={16} />
          <input type="text" placeholder="Search by name or email..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
      </div>

      <div className="admin-content">
        <div className="admin-bookings-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Username</th>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr><td colSpan="5" className="empty-cell">No customers found</td></tr>
              ) : paged.map(u => (
                <tr key={u.id}>
                  <td>#{u.id}</td>
                  <td><strong>{u.username}</strong></td>
                  <td>{u.email}</td>
                  <td>{u.is_staff ? <span className="role-badge admin-role"><Shield size={12} /> Admin</span> : <span className="role-badge customer-role"><User size={12} /> Customer</span>}</td>
                  <td>
                    <div className="admin-actions">
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id)}><UserX size={14} /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="pagination">
            <button className="btn btn-sm btn-ghost" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
            <span className="page-info">Page {page} of {totalPages}</span>
            <button className="btn btn-sm btn-ghost" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
          </div>
        )}
      </div>
    </div>
  );
}
