"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import api, { authAPI } from "@/lib/api/client";
import { postLoginPath, safeInternalPath } from "@/lib/onboarding";
import {
  OTP_LENGTH,
  applyOtpBackspace,
  applyOtpInput,
  emptyOtpDigits,
  isOtpComplete,
  sanitizeOtpDigits,
} from "@/lib/otp";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Mail,
  RefreshCw,
  Shield,
} from "@/components/icons";
import styles from "./verify-email-page.module.css";

function formatExpiryHint(expiresAt: string, nowMs: number): string {
  if (!expiresAt) return "";
  const target = Date.parse(expiresAt);
  if (!Number.isFinite(target)) return "";
  const diffSecs = Math.max(0, Math.floor((target - nowMs) / 1000));
  if (diffSecs <= 0) return "This code has expired — tap Resend code for a new one.";
  const mins = Math.ceil(diffSecs / 60);
  return `Code expires in about ${mins} ${mins === 1 ? "minute" : "minutes"}.`;
}

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshUser } = useAuth();

  const from = safeInternalPath(searchParams.get("from"));

  const [maskedEmail, setMaskedEmail] = useState("");
  const [digits, setDigits] = useState<string[]>(() => emptyOtpDigits(OTP_LENGTH));
  const [motionTicks, setMotionTicks] = useState<number[]>(() =>
    Array.from({ length: OTP_LENGTH }, () => 0),
  );
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendNotice, setResendNotice] = useState("");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [success, setSuccess] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [expiresAt, setExpiresAt] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());

  const inputRefs = useRef<Array<HTMLInputElement | null>>([]);
  const digitsRef = useRef<string[]>(emptyOtpDigits(OTP_LENGTH));
  const lastSubmittedCodeRef = useRef<string | null>(null);
  const verifyingRef = useRef(false);

  const updateDigits = useCallback((nextDigits: string[]) => {
    digitsRef.current = nextDigits;
    setDigits(nextDigits);
  }, []);

  const code = useMemo(() => digits.join(""), [digits]);
  const filledCount = useMemo(
    () => digits.filter((digit) => /^\d$/.test(digit)).length,
    [digits],
  );
  const complete = isOtpComplete(digits, OTP_LENGTH);

  const focusCell = useCallback((idx: number) => {
    const bounded = Math.max(0, Math.min(idx, OTP_LENGTH - 1));
    const el = inputRefs.current[bounded];
    if (!el || el.disabled) return;
    el.focus({ preventScroll: true });
    try {
      el.setSelectionRange(0, el.value.length);
    } catch {
      el.select();
    }
  }, []);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await api.get("/auth/verify-email/");
        if (!active) return;
        if (res.data?.pending === false) {
          router.replace(`/login/?from=${encodeURIComponent(from)}`);
          return;
        }
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
    if (!loading && !success) {
      const timer = window.setTimeout(() => focusCell(0), 60);
      return () => window.clearTimeout(timer);
    }
  }, [focusCell, loading, success]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => {
      setCooldown((current) => (current > 0 ? current - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  useEffect(() => {
    if (!expiresAt) return;
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [expiresAt]);

  const verifyCode = useCallback(
    async (candidate: string) => {
      if (verifyingRef.current || candidate.length !== OTP_LENGTH) return;
      verifyingRef.current = true;
      lastSubmittedCodeRef.current = candidate;
      setBusy(true);
      setError("");
      setResendNotice("");

      try {
        await api.post("/auth/verify-email/", { code: candidate });
        await refreshUser();
        setSuccess(true);
        try {
          const userRes = await authAPI.getUser();
          const u = userRes.data;
          router.replace(
            postLoginPath(
              { id: u.id, is_staff: u.is_staff, account_type: u.account_type },
              from,
            ),
          );
        } catch {
          router.replace(postLoginPath(null, from));
        }
      } catch (err: unknown) {
        const axiosErr = err as {
          response?: { data?: { message?: string; error?: string } };
        };
        const msg =
          axiosErr?.response?.data?.message ||
          axiosErr?.response?.data?.error ||
          "Verification failed. Check the 6-digit code and try again.";
        setError(msg);
        setShaking(false);
        window.requestAnimationFrame(() => setShaking(true));
        window.setTimeout(() => focusCell(OTP_LENGTH - 1), 60);
      } finally {
        verifyingRef.current = false;
        setBusy(false);
      }
    },
    [focusCell, from, refreshUser, router],
  );

  // Automatic verification as soon as all 6 digits are entered or pasted
  useEffect(() => {
    if (loading || busy || success || !complete) return;
    if (lastSubmittedCodeRef.current === code) return;

    const timer = window.setTimeout(() => {
      void verifyCode(code);
    }, 150);
    return () => window.clearTimeout(timer);
  }, [busy, code, complete, loading, success, verifyCode]);

  const bumpMotion = (indices: number[]) => {
    if (indices.length === 0) return;
    setMotionTicks((prev) => {
      const next = [...prev];
      for (const idx of indices) {
        next[idx] = (next[idx] ?? 0) + 1;
      }
      return next;
    });
  };

  const handleDigitChange = (index: number, rawValue: string) => {
    if (busy || success) return;
    const result = applyOtpInput(digitsRef.current, index, rawValue, OTP_LENGTH);
    updateDigits(result.digits);
    bumpMotion(result.changedIndices);
    if (result.changedIndices.length > 0) {
      setError("");
      setResendNotice("");
      lastSubmittedCodeRef.current = null;
    }

    if (result.changedIndices.length > 0 && result.nextFocusIndex !== index) {
      focusCell(result.nextFocusIndex);
    } else if (sanitizeOtpDigits(rawValue, OTP_LENGTH).length > 1) {
      focusCell(result.nextFocusIndex);
    }
  };

  const handleKeyDown = (index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (busy || success) return;

    if (e.key === "Backspace") {
      e.preventDefault();
      const result = applyOtpBackspace(digitsRef.current, index, OTP_LENGTH);
      updateDigits(result.digits);
      setError("");
      lastSubmittedCodeRef.current = null;
      focusCell(result.nextFocusIndex);
      return;
    }

    if (e.key === "Delete") {
      e.preventDefault();
      const next = [...digitsRef.current];
      if (next[index] !== "") {
        next[index] = "";
        updateDigits(next);
        setError("");
        lastSubmittedCodeRef.current = null;
      }
      return;
    }

    if (e.key === "ArrowLeft" && index > 0) {
      e.preventDefault();
      focusCell(index - 1);
      return;
    }

    if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
      e.preventDefault();
      focusCell(index + 1);
      return;
    }

    if (e.key === "Home") {
      e.preventDefault();
      focusCell(0);
      return;
    }

    if (e.key === "End") {
      e.preventDefault();
      focusCell(OTP_LENGTH - 1);
      return;
    }

    // Re-typing the exact same digit into a filled box should still pop & advance
    if (/^\d$/.test(e.key) && digitsRef.current[index] === e.key) {
      e.preventDefault();
      bumpMotion([index]);
      setError("");
      lastSubmittedCodeRef.current = null;
      if (index < OTP_LENGTH - 1) {
        focusCell(index + 1);
      }
    }
  };

  const handlePaste = (index: number, e: ClipboardEvent<HTMLInputElement>) => {
    if (busy || success) return;
    const pasted = sanitizeOtpDigits(e.clipboardData.getData("text"), OTP_LENGTH);
    if (!pasted) return;
    e.preventDefault();
    const start = pasted.length >= OTP_LENGTH ? 0 : index;
    const result = applyOtpInput(digitsRef.current, start, pasted, OTP_LENGTH);
    updateDigits(result.digits);
    bumpMotion(result.changedIndices);
    setError("");
    setResendNotice("");
    lastSubmittedCodeRef.current = null;
    focusCell(result.nextFocusIndex);
  };

  const handleClearCode = () => {
    updateDigits(emptyOtpDigits(OTP_LENGTH));
    setMotionTicks(Array.from({ length: OTP_LENGTH }, () => 0));
    setError("");
    setResendNotice("");
    lastSubmittedCodeRef.current = null;
    focusCell(0);
  };

  const handleResend = async () => {
    if (cooldown > 0 || resending || busy || success) return;
    setResending(true);
    setError("");
    setResendNotice("");
    try {
      const res = await api.post("/auth/resend-code/", {});
      setMaskedEmail(res.data?.masked_email ?? maskedEmail);
      setExpiresAt(res.data?.expires_at ?? expiresAt);
      setCooldown(res.data?.cooldown ?? 60);
      updateDigits(emptyOtpDigits(OTP_LENGTH));
      setMotionTicks(Array.from({ length: OTP_LENGTH }, () => 0));
      lastSubmittedCodeRef.current = null;
      setResendNotice("A new 6-digit code has been sent to your email.");
      focusCell(0);
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { message?: string; error?: string } };
      };
      setError(
        axiosErr?.response?.data?.message ||
          axiosErr?.response?.data?.error ||
          "Could not resend the code. Please try again.",
      );
    } finally {
      setResending(false);
    }
  };

  const expiryHint = useMemo(() => formatExpiryHint(expiresAt, nowMs), [expiresAt, nowMs]);
  const progressPercent = (filledCount / OTP_LENGTH) * 100;

  if (loading) {
    return (
      <div id="verify-email-root" className={styles.page}>
        <section className={`${styles.card} ${styles.loadingCard}`} role="status" aria-live="polite">
          <Loader2 size={24} className={styles.spin} aria-hidden="true" />
          <p className={styles.loadingText}>Preparing verification…</p>
        </section>
      </div>
    );
  }

  return (
    <div id="verify-email-root" className={styles.page}>
      <section className={styles.card} aria-labelledby="verify-email-heading">
        <div className={styles.topBar}>
          <Link href="/" className={styles.brandLink} aria-label="Travel. Home">
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
          <span
            className={`${styles.mailBadge} ${success ? styles.mailBadgeSuccess : ""}`}
            aria-hidden="true"
          >
            {success ? <CheckCircle size={24} /> : <Mail size={23} />}
          </span>
          <h1 id="verify-email-heading" className={styles.title}>
            {success ? "Email verified" : "Verify your email"}
          </h1>
          <p className={styles.subtitle}>
            Enter the 6-digit code sent to your inbox. Verification starts automatically as soon as
            all 6 digits are filled.
          </p>
          {maskedEmail ? <span className={styles.emailChip}>{maskedEmail}</span> : null}
        </header>

        <div className={styles.otpSection}>
          <div className={styles.otpLabelRow}>
            <span id="verify-code-group-label" className={styles.otpLabel}>
              6-digit security code
            </span>
            <span className={styles.otpProgressText} aria-live="polite">
              {filledCount} / {OTP_LENGTH}
            </span>
          </div>

          <div
            className={`${styles.otpGrid} ${shaking ? styles.otpGridShake : ""}`}
            onAnimationEnd={() => setShaking(false)}
            role="group"
            aria-labelledby="verify-code-group-label"
          >
            {digits.map((digit, index) => {
              const isFocused = focusedIndex === index && !busy && !success;
              const isFilled = digit !== "";
              const cellStyle = { "--cell-index": index } as CSSProperties;

              const cellClassName = [
                styles.otpCell,
                isFocused ? styles.otpCellFocused : "",
                isFilled && !error && !success ? styles.otpCellFilled : "",
                isFilled && motionTicks[index] > 0 && !busy && !error && !success
                  ? styles.otpCellFilledPulse
                  : "",
                busy ? styles.otpCellVerifying : "",
                success ? styles.otpCellSuccess : "",
                error ? styles.otpCellError : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div
                  key={index}
                  className={cellClassName}
                  style={cellStyle}
                  onClick={() => {
                    if (!busy && !success) focusCell(index);
                  }}
                >
                  <input
                    ref={(node) => {
                      inputRefs.current[index] = node;
                    }}
                    id={`verify-digit-${index + 1}`}
                    type="text"
                    size={1}
                    maxLength={OTP_LENGTH}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    enterKeyHint={index === OTP_LENGTH - 1 ? "done" : "next"}
                    autoComplete={index === 0 ? "one-time-code" : "off"}
                    aria-label={`Digit ${index + 1} of ${OTP_LENGTH}`}
                    aria-invalid={Boolean(error)}
                    className={styles.otpInput}
                    value={digit}
                    disabled={busy || success}
                    onFocus={(e) => {
                      setFocusedIndex(index);
                      const input = e.currentTarget;
                      try {
                        input.setSelectionRange(0, input.value.length);
                      } catch {
                        input.select();
                      }
                    }}
                    onBlur={() => {
                      setFocusedIndex((current) => (current === index ? null : current));
                    }}
                    onChange={(e) => handleDigitChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={(e) => handlePaste(index, e)}
                  />
                  <span className={styles.otpVisual} aria-hidden="true">
                    {isFilled ? (
                      <span
                        key={`${index}-${motionTicks[index]}-${digit}`}
                        className={styles.otpDigit}
                      >
                        {digit}
                      </span>
                    ) : isFocused ? (
                      <span className={styles.otpCaret} />
                    ) : (
                      <span className={styles.otpEmptyDot} />
                    )}
                  </span>
                </div>
              );
            })}
          </div>

          <div className={styles.progressTrack} aria-hidden="true">
            <div
              className={`${styles.progressFill} ${
                success
                  ? styles.progressFillSuccess
                  : error
                    ? styles.progressFillError
                    : ""
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          {/* Live Auto-Verify Status (replaces Verify submit button) */}
          {success ? (
            <div
              className={`${styles.statusBanner} ${styles.statusBannerSuccess}`}
              role="status"
              aria-live="polite"
            >
              <span className={styles.statusBannerMain}>
                <CheckCircle size={17} aria-hidden="true" />
                <span>Verified! Redirecting to your account…</span>
              </span>
            </div>
          ) : busy ? (
            <div
              className={`${styles.statusBanner} ${styles.statusBannerVerifying}`}
              role="status"
              aria-live="polite"
            >
              <span className={styles.statusBannerMain}>
                <Loader2 size={17} className={styles.spin} aria-hidden="true" />
                <span>Verifying your 6-digit code…</span>
              </span>
            </div>
          ) : error ? (
            <div
              className={`${styles.statusBanner} ${styles.statusBannerError}`}
              role="alert"
              aria-live="assertive"
            >
              <span className={styles.statusBannerMain}>
                <AlertCircle size={17} aria-hidden="true" />
                <span>{error}</span>
              </span>
              {filledCount > 0 ? (
                <button
                  type="button"
                  className={styles.clearCodeBtn}
                  onClick={handleClearCode}
                >
                  Clear
                </button>
              ) : null}
            </div>
          ) : resendNotice ? (
            <div
              className={`${styles.statusBanner} ${styles.statusBannerSuccess}`}
              role="status"
              aria-live="polite"
            >
              <span className={styles.statusBannerMain}>
                <CheckCircle size={17} aria-hidden="true" />
                <span>{resendNotice}</span>
              </span>
            </div>
          ) : (
            <div className={styles.statusBanner} role="status" aria-live="polite">
              <span className={styles.statusBannerMain}>
                <Shield size={16} aria-hidden="true" />
                <span>
                  {filledCount === 0
                    ? "Type or paste your 6-digit code — verifies automatically"
                    : `${OTP_LENGTH - filledCount} more ${
                        OTP_LENGTH - filledCount === 1 ? "digit" : "digits"
                      } to verify automatically`}
                </span>
              </span>
            </div>
          )}
        </div>

        <footer className={styles.footer}>
          <div className={styles.actionsRow}>
            <button
              type="button"
              className={styles.resendBtn}
              onClick={handleResend}
              disabled={cooldown > 0 || resending || busy || success}
            >
              {resending ? (
                <Loader2 size={15} className={styles.spin} aria-hidden="true" />
              ) : (
                <RefreshCw size={15} aria-hidden="true" />
              )}
              {resending
                ? "Sending…"
                : cooldown > 0
                  ? `Resend in ${cooldown}s`
                  : "Resend code"}
            </button>

            <Link
              href={`/login/?from=${encodeURIComponent(from)}`}
              className={styles.backLink}
            >
              <ArrowLeft size={15} aria-hidden="true" />
              Back to login
            </Link>
          </div>

          {expiryHint ? <p className={styles.expiryNote}>{expiryHint}</p> : null}
        </footer>
      </section>
    </div>
  );
}
