"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { KeyRound, Palmtree, Compass, Map, Star } from '@/components/icons';
import type { ChangeEvent, FormEvent } from "react";

export default function LoginPage() {
  const [form, setForm] = useState<{ username: string; password: string }>({ username: '', password: '' });
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered');
  const requested = searchParams.get('from');
  const from = requested && requested.startsWith('/') && !requested.startsWith('//') ? requested : '/';

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: FormEvent<HTMLElement>) => {
    e.preventDefault();
    setError('');
    try {
      const user = await login(form.username, form.password);
      router.replace(
        user.account_type === "TOUR_COMPANY" && from === "/"
          ? "/tour-company/dashboard"
          : from,
      );
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Invalid username or password');
      setFieldErrors(err.fieldErrors || {});
    }
  };

  return (
    <div className="page auth-page auth-page-redesign">
      <div className="auth-container auth-layout-redesign">
        <div className="auth-card glass-card auth-card-redesign">
          <div className="auth-header">
            <Link href="/" className="auth-brand"><span><Palmtree size={19} /></span> Travel.</Link>
            <span className="auth-kicker">YOUR NEXT JOURNEY STARTS HERE</span>
            <h1>Welcome back</h1>
            <p>Sign in to pick up where your travels left off.</p>
          </div>

          {registered && <div className="auth-success">Account created successfully. Please sign in.</div>}
          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="login-username">Username</label>
              <input
                id="login-username"
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                autoComplete="username"
                aria-invalid={Boolean(fieldErrors.username)}
                aria-describedby={fieldErrors.username ? 'username-error' : undefined}
                placeholder="Enter your username"
              />
              {fieldErrors.username ? (
                <span className="field-error" id="username-error">{fieldErrors.username[0]}</span>
              ) : null}
            </div>
            <div className="form-group">
              <label htmlFor="login-password">Password</label>
              <input
                id="login-password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                placeholder="Enter your password"
              />
              {fieldErrors.password ? (
                <span className="field-error" id="password-error">{fieldErrors.password[0]}</span>
              ) : null}
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              Sign in <span aria-hidden="true">→</span>
            </button>
          </form>

          <div className="auth-footer">
            <Link href="/forgot-password/">Forgot your password?</Link>
            <Link href="/verify-email/">Verify your email</Link>
            <p>Don&apos;t have an account? <Link href="/register">Create one</Link></p>
          </div>
        </div>

        <div className="auth-banner auth-banner-redesign">
          <div className="auth-banner-content">
            <span className="auth-visual-label">A MARKETPLACE FOR MEANINGFUL TRAVEL</span>
            <h2>Meet the people<br />behind the place.</h2>
            <p>Explore experiences from independent tourism companies, compare the details, and send a request directly to the provider.</p>
            <div className="auth-banner-features">
              <span><Palmtree size={18} /> Local experiences</span>
              <span><Compass size={18} /> Tours & safaris</span>
              <span><Map size={18} /> Provider profiles</span>
              <span><Star size={18} fill="currentColor" className="text-yellow-500" /> Request-based bookings</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
