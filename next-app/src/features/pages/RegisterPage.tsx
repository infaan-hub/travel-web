"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { FileEdit, ClipboardList, Gem, RefreshCw, MessageSquare } from 'lucide-react';
import type { ChangeEvent, FormEvent } from "react";

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
    <div className="page auth-page auth-page-redesign">
      <div className="auth-container auth-layout-redesign auth-register-layout">
        <div className="auth-card glass-card auth-card-redesign">
          <div className="auth-header">
            <Link href="/" className="auth-brand"><span><FileEdit size={19} /></span> Travel.</Link>
            <span className="auth-kicker">A BETTER WAY TO GET AWAY</span>
            <h1>Create your account</h1>
            <p>Save your plans and book your next great escape.</p>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="register-username">Username</label>
              <input
                id="register-username"
                type="text"
                name="username"
                value={form.username}
                aria-invalid={Boolean(fieldErrors.username)}
                onChange={handleChange}
                required
                autoComplete="username"
                placeholder="Choose a username"
              />
            </div>
            <div className="form-group">
              <label htmlFor="register-email">Email</label>
              <input
                id="register-email"
                type="email"
                name="email"
                value={form.email}
                aria-invalid={Boolean(fieldErrors.email)}
                onChange={handleChange}
                required
                autoComplete="email"
                placeholder="your@email.com"
              />
            </div>
            <div className="form-group">
              <label htmlFor="register-password">Password</label>
              <input
                id="register-password"
                type="password"
                name="password"
                value={form.password}
                aria-invalid={Boolean(fieldErrors.password)}
                onChange={handleChange}
                required
                autoComplete="new-password"
                placeholder="Create a strong password"
                minLength={6}
              />
            </div>
            <div className="form-group">
              <label htmlFor="register-confirm-password">Confirm password</label>
              <input
                id="register-confirm-password"
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                onChange={handleChange}
                required
                autoComplete="new-password"
                placeholder="Confirm your password"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              Create account <span aria-hidden="true">→</span>
            </button>
          </form>

          <div className="auth-footer">
            <p>Already have an account? <Link href="/login">Sign in</Link></p>
          </div>
        </div>

        <div className="auth-banner auth-banner-redesign">
          <div className="auth-banner-content">
            <span className="auth-visual-label">YOUR TRIP, BEAUTIFULLY ORGANIZED</span>
            <h2>Good things<br />are out there.</h2>
            <p>Find your pace, discover somewhere new, and let the details fall into place.</p>
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
