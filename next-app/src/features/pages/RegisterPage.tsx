"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FileEdit, ClipboardList, Gem, RefreshCw, MessageSquare } from 'lucide-react';
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";

export default function RegisterPage() {
  const [form, setForm] = useState<{ username: string; email: string; password: string; confirmPassword: string }>({ username: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const { register } = useAuth();
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
      await register(form.username, form.email, form.password);
      router.push('/login?registered=1');
    } catch (err: any) {
      setFieldErrors(err.fieldErrors || {});
      const detail = err.response?.data;
      if (detail?.username) setError('Username already exists');
      else if (detail?.email) setError('Email already exists');
      else setError('Registration failed. Please try again.');
    }
  };

  return (
    <div className="page auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <span className="auth-icon"><FileEdit size={24} /></span>
            <h1>Create Account</h1>
            <p>Join us and start your adventure</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Username *</label>
              <input
                type="text"
                name="username"
                value={form.username}
                aria-invalid={Boolean(fieldErrors.username)}
                onChange={handleChange}
                required
                placeholder="Choose a username"
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                name="email"
                value={form.email}
                aria-invalid={Boolean(fieldErrors.email)}
                onChange={handleChange}
                required
                placeholder="your@email.com"
              />
            </div>
            <div className="form-group">
              <label>Password *</label>
              <input
                type="password"
                name="password"
                value={form.password}
                aria-invalid={Boolean(fieldErrors.password)}
                onChange={handleChange}
                required
                placeholder="Create a strong password"
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label>Confirm Password *</label>
              <input
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                onChange={handleChange}
                required
                placeholder="Confirm your password"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              Create Account
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link href="/login">Sign in</Link></p>
          </div>
        </div>

        <div className="auth-banner">
          <div className="auth-banner-content">
            <h2>Start Your Journey</h2>
            <p>Create an account to book tours and manage your adventures</p>
            <div className="auth-banner-features">
              <span><ClipboardList size={18} /> Easy Booking</span>
              <span><Gem size={18} /> Exclusive Deals</span>
              <span><RefreshCw size={18} /> Manage Trips</span>
              <span><MessageSquare size={18} /> 24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}