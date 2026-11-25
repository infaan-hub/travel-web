"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { Loader2, Mail } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { ArrowLeft, ArrowRight, CheckCircle, KeyRound, Shield } from "@/components/icons";
import styles from "./auth-page.module.css";

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/auth/password-reset/request/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Request failed");
      setSent(true);
      toast.success("Reset requested. Check your email or speak with our team for your code.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div id="auth-page-root" className={styles.page}>
      <section
        className={`${styles.shell} ${styles.shellSingle}`}
        aria-labelledby="forgot-password-heading"
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
              Account recovery
            </span>
          </div>

          <header className={`${styles.header} ${styles.headerCentered}`}>
            <span
              className={`${styles.iconBadge} ${sent ? styles.iconBadgeSuccess : ""}`}
              aria-hidden="true"
            >
              {sent ? <CheckCircle size={22} /> : <KeyRound size={22} />}
            </span>
            <h1 id="forgot-password-heading" className={styles.title}>
              {sent ? "Reset request sent" : "Forgot your password?"}
            </h1>
            <p className={styles.subtitle}>
              {sent
                ? "Follow the next step below once you receive your 6-digit reset code."
                : "Enter the email linked to your Travel. account and we will issue a 30-minute reset code."}
            </p>
          </header>

          {sent ? (
            <div className={styles.sentPanel} role="status" aria-live="polite">
              <h2 className={styles.sentTitle}>Request received</h2>
              <p className={styles.sentText}>
                If <strong>{email.trim()}</strong> is registered, a password reset code has been
                issued and remains valid for 30 minutes.
              </p>
              <div className={styles.sentActions}>
                <Link href="/reset-password/" className={styles.linkPrimary}>
                  Enter reset code
                  <ArrowRight size={16} aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form} aria-busy={busy}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="forgot-email">
                  Email address
                </label>
                <div className={styles.inputWrap}>
                  <span className={styles.inputIcon} aria-hidden="true">
                    <Mail size={16} />
                  </span>
                  <input
                    id="forgot-email"
                    type="email"
                    name="email"
                    className={`${styles.input} ${styles.inputWithIcon}`}
                    value={email}
                    onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    aria-describedby="forgot-email-hint"
                  />
                </div>
                <p className={styles.hint} id="forgot-email-hint">
                  Use the email address registered on your Travel. account.
                </p>
              </div>

              <button type="submit" className={styles.submit} disabled={busy}>
                {busy ? (
                  <>
                    <Loader2 size={17} className={styles.spin} aria-hidden="true" />
                    <span>Requesting code…</span>
                  </>
                ) : (
                  <>
                    <span>Request reset code</span>
                    <KeyRound size={16} aria-hidden="true" />
                  </>
                )}
              </button>
            </form>
          )}

          <footer className={styles.footer}>
            <div className={styles.footerRow}>
              <Link href="/login/" className={styles.backLink}>
                <ArrowLeft size={15} aria-hidden="true" />
                Back to sign in
              </Link>
              {!sent ? (
                <Link href="/reset-password/" className={styles.inlineLink}>
                  Already have a code?
                </Link>
              ) : null}
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}
