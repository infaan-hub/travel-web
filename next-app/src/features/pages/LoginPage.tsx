"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { KeyRound, Palmtree, Compass, Map, Star } from 'lucide-react';
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";

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
      await login(form.username, form.password);
      router.replace(from);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Invalid username or password');
      setFieldErrors(err.fieldErrors || {});
    }
  };

  return (
    <div className="page auth-page">
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <span className="auth-icon"><KeyRound size={24} /></span>
            <h1>Welcome Back</h1>
            <p>Sign in to manage your bookings</p>
          </div>

          {registered && <div className="auth-success">Account created successfully. Please sign in.</div>}
          {error && <div className="auth-error">{error}</div>}

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Username</label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                required
                aria-invalid={Boolean(fieldErrors.username)}
                aria-describedby={fieldErrors.username ? 'username-error' : undefined}
                placeholder="Enter your username"
              />
              {fieldErrors.username ? (
                <span className="field-error" id="username-error">{fieldErrors.username[0]}</span>
              ) : null}
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                required
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                placeholder="Enter your password"
              />
              {fieldErrors.password ? (
                <span className="field-error" id="password-error">{fieldErrors.password[0]}</span>
              ) : null}
            </div>
            <button type="submit" className="btn btn-primary btn-block">
              Sign In
            </button>
          </form>

          <div className="auth-footer">
            <Link href="/forgot-password/">Forgot your password?</Link>
            <Link href="/verify-email/">Verify your email</Link>
            <p>Don&apos;t have an account? <Link href="/register">Create one</Link></p>
          </div>
        </div>

        <div className="auth-banner">
          <div className="auth-banner-content">
            <h2>Explore with Travel.</h2>
            <p>From Zanzibar beaches to Serengeti safaris, discover Africa with expert guidance</p>
            <div className="auth-banner-features">
              <span><Palmtree size={18} /> Zanzibar Tours</span>
              <span><Compass size={18} /> Tanzania Safaris</span>
              <span><Map size={18} /> Expert Guides</span>
              <span><Star size={18} fill="currentColor" className="text-yellow-500" /> Best Prices</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}