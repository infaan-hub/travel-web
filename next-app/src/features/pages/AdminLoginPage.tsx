"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, BarChart3, ClipboardList, Globe, Users } from 'lucide-react';
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";

export default function AdminLoginPage() {
  const [form, setForm] = useState<{ username: string; password: string }>({ username: '', password: '' });
  const [error, setError] = useState('');
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: FormEvent<HTMLElement>) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(form.username, form.password);
      if (user.is_staff) {
        router.push('/admin/dashboard');
      } else {
        setError('This area is for administrators only. Please use the customer login.');
      }
    } catch (err: any) {
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

          {registered && <div className="auth-success">Administrator account created. Please sign in.</div>}
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
            <p>Not an admin? <Link href="/login">Customer Login</Link></p>
            <p>New admin? <Link href="/admin/register">Register as Admin</Link></p>
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