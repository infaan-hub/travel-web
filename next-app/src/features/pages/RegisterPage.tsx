"use client";

import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, ArrowRight, ClipboardList, FileEdit, Gem, MessageSquare, RefreshCw, Sparkles } from '@/components/icons';
import styles from './auth-page.module.css';
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
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.formCard}>
          <div className={styles.brandRow}>
            <Link href="/" className={styles.brand}>
              <span className={styles.brandMark}><FileEdit size={18} /></span>
              Travel.
            </Link>
          </div>

          <div className={styles.header}>
            <span className={styles.kicker}>A better way to get away</span>
            <h1 className={styles.title}>Create your account</h1>
            <p className={styles.subtitle}>Save your plans and book your next great escape.</p>
          </div>

          {error && (
            <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="register-username">Username</label>
              <input
                id="register-username"
                type="text"
                name="username"
                value={form.username}
                aria-invalid={Boolean(fieldErrors.username)}
                aria-describedby={fieldErrors.username ? 'register-username-error' : undefined}
                onChange={handleChange}
                required
                autoComplete="username"
                placeholder="Choose a username"
              />
              {fieldErrors.username ? (
                <span className={styles.fieldError} id="register-username-error">{fieldErrors.username[0]}</span>
              ) : null}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="register-email">Email</label>
              <input
                id="register-email"
                type="email"
                name="email"
                value={form.email}
                aria-invalid={Boolean(fieldErrors.email)}
                aria-describedby={fieldErrors.email ? 'register-email-error' : undefined}
                onChange={handleChange}
                required
                autoComplete="email"
                placeholder="your@email.com"
              />
              {fieldErrors.email ? (
                <span className={styles.fieldError} id="register-email-error">{fieldErrors.email[0]}</span>
              ) : null}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="register-password">Password</label>
              <input
                id="register-password"
                type="password"
                name="password"
                value={form.password}
                aria-invalid={Boolean(fieldErrors.password)}
                aria-describedby={fieldErrors.password ? 'register-password-error' : undefined}
                onChange={handleChange}
                required
                autoComplete="new-password"
                placeholder="Create a strong password"
                minLength={6}
              />
              {fieldErrors.password ? (
                <span className={styles.fieldError} id="register-password-error">{fieldErrors.password[0]}</span>
              ) : null}
            </div>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="register-confirm-password">Confirm password</label>
              <input
                id="register-confirm-password"
                type="password"
                name="confirmPassword"
                value={form.confirmPassword}
                aria-invalid={Boolean(fieldErrors.confirmPassword)}
                aria-describedby={fieldErrors.confirmPassword ? 'register-confirm-password-error' : undefined}
                onChange={handleChange}
                required
                autoComplete="new-password"
                placeholder="Confirm your password"
              />
              {fieldErrors.confirmPassword ? (
                <span className={styles.fieldError} id="register-confirm-password-error">{fieldErrors.confirmPassword[0]}</span>
              ) : null}
            </div>
            <button type="submit" className={styles.submit}>
              <span>Create account</span>
              <span className={styles.submitIcon} aria-hidden="true"><ArrowRight size={17} /></span>
            </button>
          </form>

          <div className={styles.footer}>
            <p className={styles.footerMuted}>
              Already have an account? <Link href="/login" className={styles.footerStrong}>Sign in</Link>
            </p>
          </div>
        </div>

        <div className={`${styles.banner} ${styles.bannerRegister}`}>
          <div className={styles.bannerTop}>
            <span className={styles.bannerBadge}><Sparkles size={14} /> Start exploring</span>
            <span className={styles.bannerMeta}>Kilimanjaro · TZ</span>
          </div>
          <div className={styles.bannerBody}>
            <span className={styles.bannerLabel}>Your trip, beautifully organized</span>
            <h2 className={styles.bannerTitle}>Good things<br />are out there.</h2>
            <p className={styles.bannerText}>Find your pace, discover somewhere new, and let the details fall into place.</p>
            <div className={styles.bannerFeatures}>
              <span className={styles.bannerFeature}><ClipboardList size={17} /> Easy Booking</span>
              <span className={styles.bannerFeature}><Gem size={17} /> Exclusive Deals</span>
              <span className={styles.bannerFeature}><RefreshCw size={17} /> Manage Trips</span>
              <span className={styles.bannerFeature}><MessageSquare size={17} /> 24/7 Support</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
