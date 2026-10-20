"use client";

import { useState } from "react";
import Link from "next/link";
import { useToast } from "@/components/ToastProvider";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";

export default function ForgotPasswordPage() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
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
    <div className="page auth-page">
      <div className="auth-container">
        <div className="auth-card glass-card">
          <div className="auth-header">
            <h1>Reset your password</h1>
            <p>We verify every reset in person before a code is issued</p>
          </div>

          {sent ? (
            <div className="auth-success">
              If that email is registered, a reset has been requested. Our team will verify you
              in person and hand you a reset code, which is valid for 30 minutes.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label htmlFor="reset-email">Email</label>
                <input
                  id="reset-email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setEmail(event.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
                {busy ? "Requesting..." : "Request a reset code"}
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