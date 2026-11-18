"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { CheckCircle2, LoaderCircle, ShieldCheck } from "lucide-react";
import { partnerRequestsAPI } from "@/lib/api/client";
import { PageHero } from "@/components/PageHero";
import { useToast } from "@/components/ToastProvider";
import styles from "@/features/pages/driver-application.module.css";

const initialForm = {
  full_name: "", phone: "", email: "", username: "", password: "", license_number: "",
  id_type: "ZAN_ID", id_number: "", experience: "3-5 years", languages: "English, Swahili",
  vehicle_info: "", notes: "",
};

export default function DriverApplicationPage() {
  const toast = useToast();
  const [form, setForm] = useState(initialForm);
  const [submitting, setSubmitting] = useState(false);
  const [applicationSent, setApplicationSent] = useState(false);

  const update = (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await partnerRequestsAPI.submit({ type: "PUBLIC_DRIVER_REGISTRATION", ...form });
      setApplicationSent(true);
      setForm(initialForm);
    } catch (error: any) {
      toast.error(error?.response?.data?.message || "Could not submit your driver application.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <PageHero eyebrow="Public Hire Driver" title="Apply to join the driver network" subtitle="Create your sign-in details and submit your driving credentials for review." backgroundImageKey="feature" patternImageKey="thumb" />
      <div className={styles.shell}>
        {applicationSent ? (
          <section className={styles.success} role="status">
            <span><CheckCircle2 size={28} /></span>
            <h2>Application submitted</h2>
            <p>Your application is pending admin approval. Your account is inactive until approval. Once approved, sign in with the username and password you chose to open your driver dashboard.</p>
            <Link className="btn btn-primary" href="/contact/">Back to contact</Link>
          </section>
        ) : (
          <form className={styles.form} onSubmit={submit}>
            <header className={styles.formHead}>
              <div><p className={styles.kicker}>Driver application</p><h2>Join as a Public Hire Driver</h2><p>Your details are reviewed by an administrator before your driver login is activated.</p></div>
              <span className={styles.reviewBadge}><ShieldCheck size={17} /> Approval required</span>
            </header>

            <section className={styles.section}>
              <h3>Driver details</h3>
              <div className={styles.grid}>
                <label>Full name *<input name="full_name" autoComplete="name" required value={form.full_name} onChange={update} /></label>
                <label>Phone / WhatsApp *<input name="phone" type="tel" autoComplete="tel" required value={form.phone} onChange={update} placeholder="+255 777 888 999" /></label>
                <label>Email address *<input name="email" type="email" autoComplete="email" required value={form.email} onChange={update} /></label>
                <label>Driving license number *<input name="license_number" required value={form.license_number} onChange={update} /></label>
                <label>ID document type *<select name="id_type" value={form.id_type} onChange={update}><option value="ZAN_ID">ZanID</option><option value="NIDA">NIDA</option><option value="PASSPORT">Passport</option></select></label>
                <label>ID / passport number *<input name="id_number" required value={form.id_number} onChange={update} /></label>
              </div>
            </section>

            <section className={styles.section}>
              <h3>Driver sign-in credentials</h3>
              <p className={styles.sectionCopy}>The account is created in a pending state and cannot sign in until an administrator approves the application.</p>
              <div className={styles.grid}>
                <label>Username *<input name="username" autoComplete="username" minLength={3} maxLength={64} required value={form.username} onChange={update} /></label>
                <label>Temporary password *<input name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required value={form.password} onChange={update} /><small>Use at least 12 characters.</small></label>
              </div>
            </section>

            <section className={styles.section}>
              <h3>Experience and availability</h3>
              <div className={styles.grid}>
                <label>Driving experience<select name="experience" value={form.experience} onChange={update}><option>1-2 years</option><option>3-5 years</option><option>5-10 years</option><option>10+ years</option></select></label>
                <label>Spoken languages<input name="languages" value={form.languages} onChange={update} placeholder="English, Swahili" /></label>
                <label className={styles.wide}>Own vehicle details (optional)<input name="vehicle_info" value={form.vehicle_info} onChange={update} placeholder="Vehicle model and registration, if applicable" /></label>
                <label className={styles.wide}>Additional notes<textarea name="notes" rows={4} value={form.notes} onChange={update} placeholder="Share route knowledge, availability, or other relevant details." /></label>
              </div>
            </section>

            <footer className={styles.actions}>
              <p><ShieldCheck size={16} /> Your password is stored securely and is not shared with the reviewing team.</p>
              <button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? <LoaderCircle className={styles.spin} size={16} /> : null}{submitting ? "Submitting…" : "Submit application"}</button>
            </footer>
          </form>
        )}
      </div>
    </main>
  );
}
