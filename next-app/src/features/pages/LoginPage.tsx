"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, ArrowRight, CheckCircle, Palmtree, Compass, Map, Star, Sparkles } from '@/components/icons';
import styles from './auth-page.module.css';
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
      if (user.is_staff) {
        router.replace("/admin/dashboard");
        return;
      }
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
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.formCard}>
          <div className={styles.brandRow}>
            <Link href="/" className={styles.brand}>
              <span className={styles.brandMark}><Palmtree size={18} /></span>
              Travel.
            </Link>
          </div>

          <div className={styles.header}>
            <span className={styles.kicker}>Your next journey starts here</span>
            <h1 className={styles.title}>Welcome back</h1>
            <p className={styles.subtitle}>Sign in to pick up where your travels left off.</p>
          </div>

          {registered && (
            <div className={`${styles.notice} ${styles.noticeSuccess}`} role="status">
              <CheckCircle size={18} />
              <span>Account created successfully. Please sign in.</span>
            </div>
          )}
          {error && (
            <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-username">Username</label>
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
                <span className={styles.fieldError} id="username-error">{fieldErrors.username[0]}</span>
              ) : null}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-password">Password</label>
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
                <span className={styles.fieldError} id="password-error">{fieldErrors.password[0]}</span>
              ) : null}
            </div>
            <button type="submit" className={styles.submit}>
              <span>Sign in</span>
              <span className={styles.submitIcon} aria-hidden="true"><ArrowRight size={17} /></span>
            </button>
          </form>

          <div className={styles.footer}>
            <div className={styles.footerLinks}>
              <Link href="/forgot-password/" className={styles.footerLink}>Forgot your password?</Link>
              <span className={styles.footerDot} aria-hidden="true" />
              <Link href="/verify-email/" className={styles.footerLink}>Verify your email</Link>
            </div>
            <p className={styles.footerMuted}>
              Don&apos;t have an account? <Link href="/register" className={styles.footerStrong}>Create one</Link>
            </p>
          </div>
        </div>

        <div className={styles.banner}>
          <div className={styles.bannerTop}>
            <span className={styles.bannerBadge}><Sparkles size={14} /> Handpicked travel</span>
            <span className={styles.bannerMeta}>Zanzibar · TZ</span>
          </div>
          <div className={styles.bannerBody}>
            <span className={styles.bannerLabel}>A marketplace for meaningful travel</span>
            <h2 className={styles.bannerTitle}>Meet the people<br />behind the place.</h2>
            <p className={styles.bannerText}>Explore experiences from independent tourism companies, compare the details, and send a request directly to the provider.</p>
            <div className={styles.bannerFeatures}>
              <span className={styles.bannerFeature}><Palmtree size={17} /> Local experiences</span>
              <span className={styles.bannerFeature}><Compass size={17} /> Tours &amp; safaris</span>
              <span className={styles.bannerFeature}><Map size={17} /> Provider profiles</span>
              <span className={styles.bannerFeature}><Star size={17} fill="currentColor" className={styles.bannerStar} /> Request-based bookings</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
