"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, BarChart3, ClipboardList, Globe, Users } from '@/components/icons';
import type { ChangeEvent, FormEvent } from "react";

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
    <div className="page auth-page auth-page-redesign admin-auth-page">
      <div className="auth-container auth-layout-redesign admin-auth-layout">
        <div className="auth-card glass-card auth-card-redesign admin-auth-card">
          <div className="auth-header">
            <Link href="/" className="auth-brand"><span><Lock size={19} /></span> Travel <b>Admin</b></Link>
            <span className="auth-kicker">SECURE ADMINISTRATION</span>
            <h1>Welcome back</h1>
            <p>Sign in to manage tours, bookings, and travellers.</p>
          </div>

          {registered && <div className="auth-success">Administrator account created. Please sign in.</div>}
          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="admin-username">Username</label>
              <input id="admin-username" type="text" name="username" value={form.username} onChange={handleChange} autoComplete="username" required placeholder="Enter your admin username" />
            </div>
            <div className="form-group">
              <label htmlFor="admin-password">Password</label>
              <input id="admin-password" type="password" name="password" value={form.password} onChange={handleChange} autoComplete="current-password" required placeholder="Enter your password" />
            </div>
            <button type="submit" className="btn btn-primary btn-block">Sign in to dashboard <span aria-hidden="true">→</span></button>
          </form>

          <div className="auth-footer">
            <p>Not an admin? <Link href="/login">Customer Login</Link></p>
            <p>New admin? <Link href="/admin/register">Register as Admin</Link></p>
          </div>
        </div>

        <div className="auth-banner auth-banner-redesign admin-auth-banner">
          <div className="auth-banner-content">
            <span className="auth-visual-label">TRAVEL OPERATIONS</span>
            <h2>Every detail,<br />in one place.</h2>
            <p>A clear view of the trips, guests, and day-to-day operations that make every journey memorable.</p>
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
