"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import api, { authAPI } from "@/lib/api/client";
import { postLoginPath, safeInternalPath } from "@/lib/onboarding";
import styles from "./auth-page.module.css";
import { ArrowRight, AlertCircle, CheckCircle } from "@/components/icons";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  const from = safeInternalPath(searchParams.get("from"));
  const [maskedEmail, setMaskedEmail] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [expiresAt, setExpiresAt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get("/auth/verify-email/");
        if (!active) return;
        setMaskedEmail(res.data?.masked_email ?? "");
        setExpiresAt(res.data?.expires_at ?? "");
        setCooldown(res.data?.cooldown_remaining ?? 0);
      } catch {
        if (active) router.replace(`/login/?from=${encodeURIComponent(from)}`);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [from, router]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleCodeChange = (value: string) => {
    const cleaned = value.replace(/\\D/g, "").slice(0, 6);
    setCode(cleaned);
    setError("");
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    const cleaned = text.replace(/\\D/g, "").slice(0, 6);
    if (cleaned.length === 6) {
      e.preventDefault();
      setCode(cleaned);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError("Please enter the 6-digit code.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.post("/auth/verify-email/", { code });
      await refreshUser();
      try {
        const userRes = await authAPI.getUser();
        const u = userRes.data;
        setSuccess(true);
        router.replace(postLoginPath({ is_staff: u.is_staff, account_type: u.account_type }, from));
      } catch {
        router.replace(postLoginPath(null, from));
      }
    } catch (err: any) {
      setError(err?.response?.data?.message || "Verification failed. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;
    setResending(true);
    setError("");
    try {
      const res = await api.post("/auth/resend-code/", {});
      setMaskedEmail(res.data?.masked_email ?? maskedEmail);
      setExpiresAt(res.data?.expires_at ?? expiresAt);
      setCooldown(res.data?.cooldown ?? 60);
      setCode("");
      inputRef.current?.focus();
    } catch (err: any) {
      setError(err?.response?.data?.message || "Could not resend the code. Please try again.");
    } finally {
      setResending(false);
    }
  };

  if (loading) {
    return (
      <div className={styles.page} role="status" aria-live="polite">
        Preparing verification...
      </div>
    );
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
            <span className={styles.kicker}>Almost there</span>
            <h1 className={styles.title}>Verify your email</h1>
            <p className={styles.subtitle}>
              We sent a 6-digit verification code to your registered email{maskedEmail ? ` (${maskedEmail})` : ""}. Enter it below to finish signing in.
            </p>
          </div>

          {error && (
            <div className={`${styles.notice} ${styles.noticeError}`} role="alert" aria-live="assertive">
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className={`${styles.notice} ${styles.noticeSuccess}`} role="status">
              <CheckCircle size={18} />
              <span>Email verified. Redirecting...</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label className={styles.label} htmlFor="verify-code">Verification code</label>
              <input
                ref={inputRef}
                id="verify-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                value={code}
                onChange={(e) => handleCodeChange(e.target.value)}
                onPaste={handlePaste}
                required
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "verify-error" : undefined}
                placeholder="Enter 6-digit code"
                style={{ letterSpacing: "0.3em", textAlign: "center", fontSize: "1.25rem" }}
              />
              {error && <span className={styles.fieldError} id="verify-error">{error}</span>}
            </div>

            <button type="submit" className={styles.submit} disabled={busy || code.length !== 6}>
              <span>{busy ? "Verifying..." : "Verify and Continue"}</span>
              <span className={styles.submitIcon} aria-hidden="true"><ArrowRight size={17} /></span>
            </button>
          </form>

          <div style={{ marginTop: 12, textAlign: "center" }}>
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              style={{
                background: "none",
                border: "none",
                color: "var(--auth-blue)",
                fontWeight: 700,
                cursor: cooldown > 0 || resending ? "not-allowed" : "pointer",
                opacity: cooldown > 0 || resending ? 0.6 : 1,
              }}
            >
              {resending
                ? "Sending..."
                : cooldown > 0
                ? `Resend code in ${cooldown}s`
                : "Resend code"}
            </button>
          </div>

          <div className={styles.footer}>
            <div className={styles.footerLinks}>
              <Link href={`/login/?from=${encodeURIComponent(from)}`} className={styles.footerLink}>
                Back to Login
              </Link>
            </div>
          </div>
        </div>

        <div className={styles.banner}>
          <div className={styles.bannerTop}>
            <span className={styles.bannerBadge}>Verification</span>
            <span className={styles.bannerMeta}>Travel.</span>
          </div>
          <div className={styles.bannerBody}>
            <span className={styles.bannerLabel}>Secure sign in</span>
            <h2 className={styles.bannerTitle}>One more step<br />to your journey.</h2>
            <p className={styles.bannerText}>We verify every sign-in to keep your account safe.</p>
          </div>
        </div>
      </div>
    </div>
  );
}