"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useState, type ChangeEvent, type FormEvent } from "react";
import { Eye, EyeOff, Loader2, Lock, Mail, User } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  ClipboardList,
  MessageSquare,
  Palmtree,
  RefreshCw,
  Shield,
} from "@/components/icons";
import styles from "./auth-page.module.css";

type RegisterApiError = {
  response?: { data?: { username?: unknown; email?: unknown; message?: string; detail?: string } };
  fieldErrors?: Record<string, string[]>;
};

export default function RegisterPage() {
  const [form, setForm] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({});
  const { register } = useAuth();
  const router = useRouter();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError("");
  };

  const passwordsEntered = form.password.length > 0 && form.confirmPassword.length > 0;
  const passwordsMatch = form.password === form.confirmPassword;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setFieldErrors({});

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);
    try {
      await register(form.username.trim(), form.email.trim(), form.password);
      router.push("/login/?registered=1");
    } catch (err: unknown) {
      const apiErr = err as RegisterApiError;
      setFieldErrors(apiErr?.fieldErrors || {});
      const detail = apiErr?.response?.data;
      if (detail?.username) setError("That username is already taken.");
      else if (detail?.email) setError("An account with that email already exists.");
      else if (detail?.message || detail?.detail) {
        setError(String(detail.message || detail.detail));
      } else {
        setError("Registration failed. Please check your details and try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="auth-page-root" className={styles.page}>
      <section className={styles.shell} aria-labelledby="register-heading">
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
              Free account
            </span>
          </div>

          <header className={styles.header}>
            <span className={styles.kicker}>Get started</span>
            <h1 id="register-heading" className={styles.title}>
              Create your account
            </h1>
            <p className={styles.subtitle}>
              Book local transfers, track your trips, and save favorite destinations.
            </p>
          </header>

          {error ? (
            <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
              <AlertCircle size={17} aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className={styles.form} aria-busy={submitting}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="register-username">
                Username
              </label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <User size={16} />
                </span>
                <input
                  id="register-username"
                  type="text"
                  name="username"
                  className={`${styles.input} ${styles.inputWithIcon}`}
                  value={form.username}
                  aria-invalid={Boolean(fieldErrors.username)}
                  aria-describedby={fieldErrors.username ? "register-username-error" : undefined}
                  onChange={handleChange}
                  required
                  autoComplete="username"
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="Choose a username"
                />
              </div>
              {fieldErrors.username ? (
                <span className={styles.fieldError} id="register-username-error">
                  {fieldErrors.username[0]}
                </span>
              ) : null}
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="register-email">
                Email address
              </label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <Mail size={16} />
                </span>
                <input
                  id="register-email"
                  type="email"
                  name="email"
                  className={`${styles.input} ${styles.inputWithIcon}`}
                  value={form.email}
                  aria-invalid={Boolean(fieldErrors.email)}
                  aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </div>
              {fieldErrors.email ? (
                <span className={styles.fieldError} id="register-email-error">
                  {fieldErrors.email[0]}
                </span>
              ) : null}
            </div>

            <div className={styles.fieldRow}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="register-password">
                  Password
                </label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon} aria-hidden="true">
                    <Lock size={16} />
                  </span>
                  <input
                    id="register-password"
                    type={showPassword ? "text" : "password"}
                    name="password"
                    className={`${styles.input} ${styles.inputWithIcon} ${styles.inputWithToggle}`}
                    value={form.password}
                    aria-invalid={Boolean(fieldErrors.password)}
                    aria-describedby={fieldErrors.password ? "register-password-error" : undefined}
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                    placeholder="Min. 6 chars"
                    minLength={6}
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
                  <span className={styles.fieldError} id="register-password-error">
                    {fieldErrors.password[0]}
                  </span>
                ) : null}
              </div>

              <div className={styles.field}>
                <label className={styles.label} htmlFor="register-confirm-password">
                  Confirm password
                </label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon} aria-hidden="true">
                    <Lock size={16} />
                  </span>
                  <input
                    id="register-confirm-password"
                    type={showConfirm ? "text" : "password"}
                    name="confirmPassword"
                    className={`${styles.input} ${styles.inputWithIcon} ${styles.inputWithToggle}`}
                    value={form.confirmPassword}
                    aria-invalid={
                      Boolean(fieldErrors.confirmPassword) ||
                      (passwordsEntered && !passwordsMatch)
                    }
                    aria-describedby={
                      fieldErrors.confirmPassword ? "register-confirm-password-error" : undefined
                    }
                    onChange={handleChange}
                    required
                    autoComplete="new-password"
                    placeholder="Re-enter"
                  />
                  <button
                    type="button"
                    className={styles.toggleBtn}
                    onClick={() => setShowConfirm((prev) => !prev)}
                    aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                  >
                    {showConfirm ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                  </button>
                </div>
                {fieldErrors.confirmPassword ? (
                  <span className={styles.fieldError} id="register-confirm-password-error">
                    {fieldErrors.confirmPassword[0]}
                  </span>
                ) : null}
              </div>
            </div>

            {passwordsEntered ? (
              <div
                className={`${styles.passwordFeedback} ${
                  passwordsMatch ? styles.passwordMatch : styles.passwordMismatch
                }`}
                aria-live="polite"
              >
                {passwordsMatch ? (
                  <>
                    <CheckCircle size={14} aria-hidden="true" />
                    <span>Passwords match</span>
                  </>
                ) : (
                  <>
                    <AlertCircle size={14} aria-hidden="true" />
                    <span>Passwords do not match yet</span>
                  </>
                )}
              </div>
            ) : null}

            <button type="submit" className={styles.submit} disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 size={17} className={styles.spin} aria-hidden="true" />
                  <span>Creating account…</span>
                </>
              ) : (
                <>
                  <span>Create account</span>
                  <ArrowRight size={17} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <footer className={styles.footer}>
            <p className={styles.footerMuted}>
              Already have an account?{" "}
              <Link href="/login/" className={styles.footerStrong}>
                Sign in
              </Link>
            </p>
          </footer>
        </div>

        <aside className={`${styles.banner} ${styles.bannerRegister}`} aria-hidden="true">
          <div className={styles.bannerTop}>
            <span className={styles.bannerBadge}>
              <Palmtree size={13} />
              Start exploring
            </span>
            <span className={styles.bannerMeta}>Kilimanjaro · TZ</span>
          </div>
          <div className={styles.bannerBody}>
            <span className={styles.bannerLabel}>Your trip, organized cleanly</span>
            <h2 className={styles.bannerTitle}>
              Good things
              <br />
              are out there.
            </h2>
            <p className={styles.bannerText}>
              Plan coastal transfers, explore tours, and keep every trip confirmation in one place.
            </p>
            <div className={styles.bannerFeatures}>
              <span className={styles.bannerFeature}>
                <ClipboardList size={14} /> Easy booking
              </span>
              <span className={styles.bannerFeature}>
                <RefreshCw size={14} /> Live updates
              </span>
              <span className={styles.bannerFeature}>
                <MessageSquare size={14} /> Local support
              </span>
            </div>
          </div>
        </aside>
      </section>
    </div>
  );
}
