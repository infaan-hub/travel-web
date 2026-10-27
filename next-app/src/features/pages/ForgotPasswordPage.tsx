"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useToast } from "@/components/ToastProvider";
import { ArrowLeft, CheckCircle, KeyRound, Palmtree, Shield } from "@/components/icons";
import styles from "./auth-page.module.css";
import type { ChangeEvent, FormEvent } from "react";

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/auth/password-reset/request/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Request failed");
      setSent(true);
      toast.success("Reset requested. Our team will verify you in person.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Request failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={`${styles.shell} ${styles.shellForgot}`}>
        <div className={styles.formCard}>
          <div className={styles.forgotTop}>
            <Link href="/" className={styles.brand}>
              <Image src="/travel.logo.jpeg" alt="Travel." width={120} height={42} style={{ height: 30, width: "auto", objectFit: "contain" }} />
            </Link>
            <span className={styles.secureChip}><Shield size={13} /> Secure request</span>
          </div>

          <div className={styles.header}>
            <span className={styles.kicker}>Account recovery</span>
            <h1 className={styles.title}>Reset your password</h1>
            <p className={styles.subtitle}>We verify every reset in person before a code is issued.</p>
          </div>

          {sent ? (
            <div className={styles.sentPanel} role="status">
              <span className={styles.sentIcon}><CheckCircle size={26} /></span>
              <h2 className={styles.sentTitle}>Request received</h2>
              <p className={styles.sentText}>
                If that email is registered, a reset has been requested. Our team will verify you
                in person and hand you a reset code, which is valid for 30 minutes.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className={styles.form} aria-busy={busy}>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="reset-email">Email</label>
                <input
                  id="reset-email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event: ChangeEvent<HTMLInputElement>) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  aria-describedby="reset-email-hint"
                />
                <p className={styles.hint} id="reset-email-hint">Use the email address linked to your Travel. account.</p>
              </div>
              <button type="submit" className={styles.submit} disabled={busy}>
                <span>{busy ? "Requesting..." : "Request a reset code"}</span>
                <span className={styles.submitIcon} aria-hidden="true"><KeyRound size={17} /></span>
              </button>
            </form>
          )}

          <div className={styles.forgotFooter}>
            <Link href="/login/" className={styles.backLink}><ArrowLeft size={15} /> Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
