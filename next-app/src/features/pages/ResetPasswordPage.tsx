"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  KeyRound,
  Shield,
} from "@/components/icons";
import styles from "./auth-page.module.css";

export default function ResetPasswordPage() {
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState({
    email: "",
    code: "",
    new_password: "",
    confirm: "",
  });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "code" ? value.replace(/\D/g, "").slice(0, 6) : value,
    }));
    if (error) setError("");
  };

  const passwordsEntered = form.new_password.length > 0 && form.confirm.length > 0;
  const passwordsMatch = form.new_password === form.confirm;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setError("");

    if (form.new_password !== form.confirm) {
      setError("The two passwords do not match.");
      return;
    }

    setBusy(true);
    try {
      const response = await fetch("/api/auth/password-reset/confirm/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email.trim(),
          code: form.code.trim(),
          new_password: form.new_password,
          confirm: form.confirm,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "The reset failed");
      toast.success("Your password has been updated. Please sign in.");
      router.push("/login/?reset=1");
    } catch (err) {
      const message = err instanceof Error ? err.message : "The reset failed";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div id="auth-page-root" className={styles.page}>
      <section
        className={`${styles.shell} ${styles.shellSingle}`}
        aria-labelledby="reset-password-heading"
      >
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
              Secure reset
            </span>
          </div>

          <header className={`${styles.header} ${styles.headerCentered}`}>
            <span className={styles.iconBadge} aria-hidden="true">
              <KeyRound size={22} />
            </span>
            <h1 id="reset-password-heading" className={styles.title}>
              Choose a new password
            </h1>
            <p className={styles.subtitle}>
              Enter your account email, your 6-digit reset code, and a new password.
            </p>
          </header>

          {error ? (
            <div className={`${styles.notice} ${styles.noticeError}`} role="alert">
              <AlertCircle size={17} aria-hidden="true" />
              <span>{error}</span>
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className={styles.form} aria-busy={busy}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="reset-email">
                Email address
              </label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <Mail size={16} />
                </span>
                <input
                  id="reset-email"
                  type="email"
                  name="email"
                  className={`${styles.input} ${styles.inputWithIcon}`}
                  value={form.email}
                  onChange={handleChange}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="reset-code">
                6-digit reset code
              </label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <KeyRound size={16} />
                </span>
                <input
                  id="reset-code"
                  type="text"
                  name="code"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  className={`${styles.input} ${styles.inputWithIcon} ${styles.inputCode}`}
                  value={form.code}
                  onChange={handleChange}
                  required
                  autoComplete="one-time-code"
                  placeholder="000000"
                />
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="new-password">
                New password
              </label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <Lock size={16} />
                </span>
                <input
                  id="new-password"
                  type={showNewPassword ? "text" : "password"}
                  name="new_password"
                  className={`${styles.input} ${styles.inputWithIcon} ${styles.inputWithToggle}`}
                  value={form.new_password}
                  onChange={handleChange}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  placeholder="At least 8 characters"
                />
                <button
                  type="button"
                  className={styles.toggleBtn}
                  onClick={() => setShowNewPassword((prev) => !prev)}
                  aria-label={showNewPassword ? "Hide new password" : "Show new password"}
                >
                  {showNewPassword ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <div className={styles.field}>
              <label className={styles.label} htmlFor="confirm-password">
                Confirm new password
              </label>
              <div className={styles.inputWrap}>
                <span className={styles.inputIcon} aria-hidden="true">
                  <Lock size={16} />
                </span>
                <input
                  id="confirm-password"
                  type={showConfirm ? "text" : "password"}
                  name="confirm"
                  className={`${styles.input} ${styles.inputWithIcon} ${styles.inputWithToggle}`}
                  value={form.confirm}
                  onChange={handleChange}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  aria-invalid={passwordsEntered && !passwordsMatch}
                  placeholder="Repeat your new password"
                />
                <button
                  type="button"
                  className={styles.toggleBtn}
                  onClick={() => setShowConfirm((prev) => !prev)}
                  aria-label={showConfirm ? "Hide confirm password" : "Show confirm password"}
                >
                  {showConfirm ? (
                    <EyeOff size={16} aria-hidden="true" />
                  ) : (
                    <Eye size={16} aria-hidden="true" />
                  )}
                </button>
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

            <button type="submit" className={styles.submit} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 size={17} className={styles.spin} aria-hidden="true" />
                  <span>Updating password…</span>
                </>
              ) : (
                <>
                  <span>Update password</span>
                  <ArrowRight size={17} aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          <footer className={styles.footer}>
            <div className={styles.footerRow}>
              <Link href="/login/" className={styles.backLink}>
                <ArrowLeft size={15} aria-hidden="true" />
                Back to sign in
              </Link>
              <Link href="/forgot-password/" className={styles.inlineLink}>
                Request new code
              </Link>
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}
