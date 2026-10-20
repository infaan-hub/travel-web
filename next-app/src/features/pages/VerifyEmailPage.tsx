"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";

export default function VerifyEmailPage() {
  const toast = useToast();
  const [form, setForm] = useState({ email: "", code: "" });
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      const response = await fetch("/api/auth/email-verification/confirm/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "Verification failed");
      setVerified(true);
      toast.success("Your email address is verified.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Verification failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page auth-page">
      <div className="auth-container">
        <div className="auth-card glass-card">
          <div className="auth-header">
            <h1>Verify your email</h1>
            <p>Our team gives you a code when you register</p>
          </div>

          {verified ? (
            <div className="auth-success">Your email address has been verified.</div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="verify-email">Email</label>
                <input
                  id="verify-email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, email: event.target.value })}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="form-group">
                <label htmlFor="verify-code">Verification code</label>
                <input
                  id="verify-code"
                  type="text"
                  name="code"
                  inputMode="numeric"
                  value={form.code}
                  onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, code: event.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                {busy ? "Verifying..." : "Verify email"}
              </button>
            </form>
          )}

          <div className="auth-footer">
            <Link href="/login/">Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}