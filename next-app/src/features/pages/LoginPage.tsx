"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  useEffect,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type FormEvent,
} from "react";
import { Eye, EyeOff, Loader2, Lock, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Compass,
  Map,
  Palmtree,
  Shield,
} from "@/components/icons";
import styles from "./auth-page.module.css";
import {
  detectInstalledApp,
  isOnboardingComplete,
  postLoginPath,
  safeInternalPath,
} from "@/lib/onboarding";

const subscribeToOnboarding = () => () => {};
const onboardingServerSnapshot = () => false;

type AuthApiError = {
  response?: { data?: { detail?: string; message?: string } };
  fieldErrors?: Record<string, string[]>;
};

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, user, isAuthenticated, loading: authLoading } = useAuth();
  const [form, setForm] = useState<{ username: string; password: string }>({
    username: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const savedOnboardingComplete = useSyncExternalStore(
    subscribeToOnboarding,
    isOnboardingComplete,
    onboardingServerSnapshot,
  );
  const [error, setError] = useState(() => {
    const oauthError = searchParams.get("error");
    if (oauthError === "google_sign_in_failed") return "Google sign-in failed. Please try again.";
    if (oauthError === "google_email_failed") {
      return "We could not send the verification email. Check SMTP configuration and try again.";
    }
    if (oauthError === "google_not_configured") return "Google sign-in is not configured.";
    return "";
  });

  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const registered = searchParams.get("registered");
  const passwordReset = searchParams.get("reset");
  const requestedFrom = safeInternalPath(searchParams.get("from"));
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
    if (detectInstalledApp() && !onboardingComplete && !isOnboardingComplete()) {
      router.replace(`/onboarding/?from=${encodeURIComponent(from)}&next=login`);
      return;
    }
  }, [authLoading, from, isAuthenticated, onboardingComplete, router, user]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setFieldErrors({});
    setSubmitting(true);
    try {
      await login(form.username.trim(), form.password);
      router.push(`/verify-email/?from=${encodeURIComponent(from)}`);
    } catch (err: unknown) {
      const apiErr = err as AuthApiError;
      setError(
        apiErr?.response?.data?.detail ||
          apiErr?.response?.data?.message ||
          "Invalid username or password.",
      );
      setFieldErrors(apiErr?.fieldErrors || {});
    } finally {
      setSubmitting(false);
    }
  };

  const isInstalledApp = useSyncExternalStore(
    subscribeToOnboarding,
    detectInstalledApp,
    onboardingServerSnapshot,
  );

  if (
    authLoading ||
    isAuthenticated ||
    (isInstalledApp && !onboardingComplete && !savedOnboardingComplete)
  ) {
    return (
      <div id="auth-page-root" className={styles.page}>
        <div className={styles.loadingCard} role="status" aria-live="polite">
          <Loader2 size={24} className={styles.spin} aria-hidden="true" />
          <span>Preparing sign in…</span>
        </div>
      </div>
    );
  }

  return (
    <div id="auth-page-root" className={styles.page}>
      <section className={styles.shell} aria-labelledby="login-heading">
        <div className={styles.formPanel}>
          <div className={styles.topBar}>
            <Link href="/" className={styles.brand} aria-label="Travel. Home">
              <Image
                src="/travel.logo.jpeg"
                alt="Travel."
                width={110}
                height={36}
                className={styles.brandLogo}
              />
            </Link>
            <span className={styles.secureBadge}>
              <Shield size={12} aria-hidden="true" />
              Secure sign-in
            </span>
          </div>

          <header className={styles.header}>
            <span className={styles.kicker}>Welcome back</span>
            <h1 id="login-heading" className={styles.title}>
              Sign in to Travel.
            </h1>
            <p className={styles.subtitle}>
              Access your bookings, saved trips, and driver or company workspace.
            </p>
          </header>

          {registered ? (
            <div className={`${styles.notice} ${styles.noticeSuccess}`} role="status">
              <CheckCircle size={17} aria-hidden="true" />
              <span>Account created successfully. Sign in to continue.</span>
            </div>
          ) : null}

          {passwordReset ? (
            <div className={`${styles.notice} ${styles.noticeSuccess}`} role="status">
              <CheckCircle size={17} aria-hidden="true" />
              <span>Password updated. Sign in with your new password.</span>
            </div>
          ) : null}

          {error ? (
            <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
              <AlertCircle size={17} aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className={styles.form} aria-busy={submitting}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="login-username">
                Username
              </label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <User size={16} />
                </span>
                <input
                  id="login-username"
                  type="text"
                  name="username"
                  className={`${styles.input} ${styles.inputWithIcon}`}
                  value={form.username}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  aria-invalid={Boolean(fieldErrors.username)}
                  aria-describedby={fieldErrors.username ? "username-error" : undefined}
                  placeholder="Enter your username"
                />
              </div>
              {fieldErrors.username ? (
                <span className={styles.fieldError} id="username-error">
                  {fieldErrors.username[0]}
                </span>
              ) : null}
            </div>

            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label className={styles.label} htmlFor="login-password">
                  Password
                </label>
                <Link href="/forgot-password/" className={styles.inlineLink}>
                  Forgot password?
                </Link>
              </div>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <Lock size={16} />
                </span>
                <input
                  id="login-password"
                  type={showPassword ? "text" : "password"}
                  name="password"
                  className={`${styles.input} ${styles.inputWithIcon} ${styles.inputWithToggle}`}
                  value={form.password}
                  onChange={handleChange}
                  required
                  autoComplete="current-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "password-error" : undefined}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className={styles.toggleBtn}
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                </button>
              </div>
              {fieldErrors.password ? (
                <span className={styles.fieldError} id="password-error">
                  {fieldErrors.password[0]}
                </span>
              ) : null}
            </div>

            <button type="submit" className={styles.submit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={17} className={styles.spin} aria-hidden="true" />
                  <span>Signing in…</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight size={17} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ? (
            <>
              <div className={styles.divider} aria-hidden="true">
                or
              </div>
              <a
                href={`/api/auth/google/start?from=${encodeURIComponent(from)}`}
                className={styles.googleButton}
              >
                <svg className={styles.googleIcon} viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </a>
              <p className={styles.oauthHint}>Customer accounts only.</p>
            </>
          ) : null}

          <footer className={styles.footer}>
            <p className={styles.footerMuted}>
              Don&apos;t have an account?{" "}
              <Link href="/register/" className={styles.footerStrong}>
                Create account
              </Link>
            </p>
          </footer>
        </div>

        <aside className={styles.banner} aria-hidden="true">
          <div className={styles.bannerTop}>
            <span className={styles.bannerBadge}>
              <Compass size={13} />
              Handpicked travel
            </span>
            <span className={styles.bannerMeta}>Zanzibar · TZ</span>
          </div>
          <div className={styles.bannerBody}>
            <span className={styles.bannerLabel}>Trusted local marketplace</span>
            <h2 className={styles.bannerTitle}>
              Meet the people
              <br />
              behind the place.
            </h2>
            <p className={styles.bannerText}>
              Compare private hire vehicles from local operators and travel across Zanzibar with
              verified drivers.
            </p>
            <div className={styles.bannerFeatures}>
              <span className={styles.bannerFeature}>
                <Palmtree size={14} /> Private hire
              </span>
              <span className={styles.bannerFeature}>
                <Map size={14} /> Live routes
              </span>
              <span className={styles.bannerFeature}>
                <CheckCircle size={14} /> Verified drivers
              </span>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
