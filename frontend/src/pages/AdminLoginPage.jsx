import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Lock, BarChart3, ClipboardList, Globe, Users } from 'lucide-react';

export default function AdminLoginPage() {
  const [form, setForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(form.username, form.password);
      if (user.is_staff) {
        navigate('/admin/dashboard');
      } else {
        setError('This area is for administrators only. Please use the customer login.');
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Invalid credentials');
    }
  };

  return (
    <div className="page auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <span className="auth-icon"><Lock size={24} /></span>
            <h1>Admin Login</h1>
            <p>Sign in to manage your travel system</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Admin Username</label>
              <input type="text" name="username" value={form.username} onChange={handleChange} required placeholder="Admin username" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} required placeholder="Admin password" />
            </div>
            <button type="submit" className="btn btn-primary btn-block">Sign In as Admin</button>
          </form>

          <div className="auth-footer">
            <p>Not an admin? <Link to="/login">Customer Login</Link></p>
            <p>New admin? <Link to="/admin/register">Register as Admin</Link></p>
          </div>
        </div>

        <div className="auth-banner">
          <div className="auth-banner-content">
            <h2>Admin Panel</h2>
            <p>Manage tours, bookings, and customers</p>
            <div className="auth-banner-features">
              <span><BarChart3 size={18} /> System Overview</span>
              <span><ClipboardList size={18} /> Manage Bookings</span>
              <span><Globe size={18} /> Add/Edit Tours</span>
              <span><Users size={18} /> User Management</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
