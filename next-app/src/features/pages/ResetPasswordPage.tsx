"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";

export default function ResetPasswordPage() {
  const toast = useToast();
  const router = useRouter();
  const [form, setForm] = useState({ email: "", code: "", new_password: "", confirm: "" });
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (form.new_password !== form.confirm) {
      toast.error("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/password-reset/confirm/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload?.message || "The reset failed");
      toast.success("Your password has been updated. Please sign in.");
      router.push("/login/?reset=1");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "The reset failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page auth-page">
      <div className="auth-container">
        <div className="auth-card glass-card">
          <div className="auth-header">
            <h1>Choose a new password</h1>
            <p>Enter the code our team gave you</p>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label htmlFor="reset-email">Email</label>
              <input
                id="reset-email"
                type="email"
                name="email"
                value={form.email}
                onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, email: event.target.value })}
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="reset-code">Reset code</label>
              <input
                id="reset-code"
                type="text"
                name="code"
                inputMode="numeric"
                value={form.code}
                onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, code: event.target.value })}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="new-password">New password</label>
              <input
                id="new-password"
                type="password"
                name="new_password"
                value={form.new_password}
                onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, new_password: event.target.value })}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="form-group">
              <label htmlFor="confirm-password">Confirm new password</label>
              <input
                id="confirm-password"
                type="password"
                name="confirm"
                value={form.confirm}
                onChange={(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, confirm: event.target.value })}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <button type="submit" className="btn btn-primary btn-block" disabled={busy}>
              {busy ? "Updating..." : "Update password"}
            </button>
          </form>

          <div className="auth-footer">
            <Link href="/login/">Back to sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}