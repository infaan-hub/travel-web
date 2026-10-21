"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FileEdit, Settings, BarChart3, ClipboardList, Users } from '@/components/icons';
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";

export default function AdminRegisterPage() {
  const [form, setForm] = useState<{ username: string; email: string; password: string; confirmPassword: string; setupToken: string }>({ username: '', email: '', password: '', confirmPassword: '', setupToken: '' });
  const [error, setError] = useState('');
  const { adminRegister } = useAuth();
  const router = useRouter();

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: FormEvent<HTMLElement>) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    try {
      await adminRegister(form.username, form.email, form.password, form.setupToken || undefined);
      router.push('/admin/login?registered=1');
    } catch (err: any) {
      const detail = err.response?.data;
      if (detail?.username) setError('Username already exists');
      else setError('Registration failed. Please try again.');
    }
  };

  return (
    <div className="page auth-page">
      <div className="auth-container">
        <div className="auth-card glass-card">
          <div className="auth-header">
            <span className="auth-icon"><FileEdit size={24} /></span>
            <h1>Admin Registration</h1>
            <p>Create an admin account to manage the system</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Username *</label>
              <input type="text" name="username" value={form.username} onChange={handleChange} required placeholder="Choose admin username" />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="admin@travel.com" />
            </div>
            <div className="form-group">
              <label>Password *</label>
              <input type="password" name="password" value={form.password} onChange={handleChange} required placeholder="Strong password" minLength={6} />
            </div>
            <div className="form-group">
              <label>Confirm Password *</label>
              <input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} required placeholder="Confirm password" />
            </div>
            <div className="form-group">
              <label>Setup Token</label>
              <input type="password" name="setupToken" value={form.setupToken} onChange={handleChange} placeholder="Only needed for initial setup" />
            </div>
            <button type="submit" className="btn btn-primary btn-block">Register as Admin</button>
          </form>

          <div className="auth-footer">
            <p>Already have admin access? <Link href="/admin/login">Sign in</Link></p>
            <p>Not an admin? <Link href="/register">Customer Registration</Link></p>
          </div>
        </div>

        <div className="auth-banner">
          <div className="auth-banner-content">
            <h2>Admin Access</h2>
            <p>Create an administrator account</p>
            <div className="auth-banner-features">
              <span><Settings size={18} /> Full System Control</span>
              <span><BarChart3 size={18} /> Analytics Dashboard</span>
              <span><ClipboardList size={18} /> Booking Management</span>
              <span><Users size={18} /> User Administration</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}