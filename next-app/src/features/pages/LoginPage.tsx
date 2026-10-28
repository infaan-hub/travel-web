"use client";

import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { useAuth } from '@/context/AuthContext';
import { AlertCircle, ArrowRight, CheckCircle, Palmtree, Compass, Map, Star, Sparkles } from '@/components/icons';
import styles from './auth-page.module.css';
import type { ChangeEvent, FormEvent } from "react";
import {
  isOnboardingComplete,
  postLoginPath,
  safeInternalPath,
} from "@/lib/onboarding";

const subscribeToOnboarding = () => () => {};
const onboardingServerSnapshot = () => false;

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, isAuthenticated, loading: authLoading } = useAuth();
  const [form, setForm] = useState<{ username: string; password: string }>({ username: '', password: '' });
  const savedOnboardingComplete = useSyncExternalStore(
    subscribeToOnboarding,
    isOnboardingComplete,
    onboardingServerSnapshot,
  );
  const [error, setError] = useState(() => {
    const oauthError = searchParams.get('error');
    if (oauthError === 'google_sign_in_failed') return 'Google sign-in failed. Please try again.';
    if (oauthError === 'google_email_failed') return 'We could not send the verification email. Check SMTP configuration and try again.';
    if (oauthError === 'google_not_configured') return 'Google sign-in is not configured.';
    return '';
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const registered = searchParams.get('registered');
  const requestedFrom = safeInternalPath(searchParams.get('from'));
  const from =
    requestedFrom === "/dashboard" ||
    requestedFrom === "/dashboard/" ||
    requestedFrom.startsWith("/dashboard/")
      ? "/"
      : requestedFrom;
  const onboardingComplete = searchParams.get("onboarding") === "complete";

  useEffect(() => {
    if (authLoading) return;
    if (isAuthenticated) {
      router.replace(postLoginPath(user, from));
      return;
    }
    if (!onboardingComplete && !isOnboardingComplete()) {
      router.replace(`/onboarding/?from=${encodeURIComponent(from)}`);
      return;
    }
  }, [authLoading, from, isAuthenticated, onboardingComplete, router, user]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: FormEvent<HTMLElement>) => {
    e.preventDefault();
    setError('');
    try {
      await login(form.username, form.password);
      router.push(`/verify-email/?from=${encodeURIComponent(from)}`);
    } catch (err: any) {
      setError(err.response?.data?.detail || err.response?.data?.message || 'Invalid username or password');
      setFieldErrors(err.fieldErrors || {});
    }
  };

  if (
    authLoading ||
    isAuthenticated ||
    (!onboardingComplete && !savedOnboardingComplete)
  ) {
    return <div className={styles.page} role="status" aria-live="polite">Preparing sign inâ€¦</div>;
  }

  return (
    <div className={styles.page}>
      <div className={styles.shell}>
        <div className={styles.formCard}>
          <div className={styles.brandRow}>
            <Link href="/" className={styles.brand}>
              <Image src="/travel.logo.jpeg" alt="Travel." width={120} height={42} style={{ height: 30, width: "auto", objectFit: "contain" }} />
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

          {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
            <>
              <div className={styles.divider} aria-hidden="true">or</div>
              <a
                href={`/api/auth/google/start?from=${encodeURIComponent(from)}`}
                className={styles.googleButton}
              >
                <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                Sign in with Google
              </a>
              <p className={styles.oauthHint}>Customer accounts only.</p>
            </>
          ) : null}


          <div className={styles.footer}>
            <div className={styles.footerLinks}>
              <Link href="/forgot-password/" className={styles.footerLink}>Forgot your password?</Link>
            </div>
            <p className={styles.footerMuted}>
              Don&apos;t have an account? <Link href="/register" className={styles.footerStrong}>Create one</Link>
            </p>
          </div>
        </div>

        <div className={styles.banner}>
          <div className={styles.bannerTop}>
            <span className={styles.bannerBadge}><Sparkles size={14} /> Handpicked travel</span>
            <span className={styles.bannerMeta}>Zanzibar Â· TZ</span>
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






