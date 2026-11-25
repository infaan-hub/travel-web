"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { partnerRequestsAPI } from "@/lib/api/client";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Building2,
  Car,
  CheckCircle,
  Shield,
} from "@/components/icons";
import { useToast } from "@/components/ToastProvider";
import styles from "@/features/pages/contact-page.module.css";

const INITIAL_COMPANY_FORM = {
  company_name: "",
  full_name: "",
  phone: "",
  email: "",
  business_type: "Private Hire Services",
  registration_reference: "",
  depot_location: "",
  fleet_size: "1-3 Vehicles",
  notes: "",
};

function extractApiErrorMessage(err: unknown, fallback: string): string {
  const axiosLike = err as {
    response?: { data?: { message?: string; error?: string; detail?: string } };
    message?: string;
  };
  return (
    axiosLike?.response?.data?.message ||
    axiosLike?.response?.data?.error ||
    axiosLike?.response?.data?.detail ||
    (err instanceof Error && err.message ? err.message : fallback)
  );
}

export default function CompanyApplicationPage() {
  const toast = useToast();
  const [form, setForm] = useState(INITIAL_COMPANY_FORM);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setFormError("");
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    try {
      setSubmitting(true);
      const res = await partnerRequestsAPI.submit({
        type: "COMPANY_REGISTRATION",
        ...form,
      });
      setSentMessage(
        res.data?.message ||
          "Your company registration request has been submitted. Our administration team will review your fleet details and get in touch.",
      );
      setForm(INITIAL_COMPANY_FORM);
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(
        err,
        "Failed to submit company registration request.",
      );
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="contact-hub-root" className={`page ${styles.page}`}>
      <div className={styles.formShell}>
        <Link href="/contact/" className={styles.backLink}>
          <ArrowLeft size={15} aria-hidden="true" />
          Back to contact
        </Link>

        <section className={styles.formCard} aria-label="Company registration form">
          {sentMessage ? (
            <div className={styles.successPanel} role="status" aria-live="polite">
              <span className={styles.successIcon} aria-hidden="true">
                <CheckCircle size={32} />
              </span>
              <h1 className={styles.successTitle}>Company request received</h1>
              <p className={styles.successCopy}>{sentMessage}</p>

              <div className={styles.successSteps}>
                <div className={styles.successStep}>
                  <strong>1. Logged with our team</strong>
                  <span>
                    Your fleet &amp; contact details are queued for admin onboarding review.
                  </span>
                </div>
                <div className={styles.successStep}>
                  <strong>2. Direct follow-up</strong>
                  <span>
                    We will reach out via phone or email to finalize your Zanzibar company profile.
                  </span>
                </div>
              </div>

              <div className={styles.successActions}>
                <button
                  type="button"
                  className={styles.submitBtn}
                  onClick={() => setSentMessage(null)}
                >
                  Submit another request
                </button>
                <Link href="/contact/" className={styles.secondaryLink}>
                  Back to contact
                </Link>
                <Link href="/companies/" className={styles.secondaryLink}>
                  View listed companies
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              <header className={styles.formHeader}>
                <div className={styles.formHeaderCopy}>
                  <span className={styles.sectionEyebrow}>Company onboarding</span>
                  <h1 className={styles.formTitle}>Register your transport company</h1>
                  <p className={styles.formSubtitle}>
                    Share your company and fleet overview. These details go directly to our
                    administration team to review and activate your company workspace.
                  </p>
                </div>
                <span className={`${styles.slaBadge} ${styles.slaBadgeBlue}`}>
                  <Shield size={13} aria-hidden="true" />
                  Admin verification
                </span>
              </header>

              <form onSubmit={handleSubmit} className={styles.form}>
                {formError ? (
                  <div className={styles.errorAlert} role="alert">
                    <AlertCircle size={18} aria-hidden="true" />
                    <span>{formError}</span>
                  </div>
                ) : null}

                <div className={styles.fieldsetGroup}>
                  <h2 className={styles.fieldsetHeading}>
                    <Building2 size={15} aria-hidden="true" />
                    Company &amp; primary contact
                  </h2>

                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label htmlFor="company-name" className={styles.label}>
                        Company name<span className={styles.req}>*</span>
                      </label>
                      <input
                        id="company-name"
                        type="text"
                        name="company_name"
                        autoComplete="organization"
                        className={styles.input}
                        value={form.company_name}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Zanzibar Executive Fleets Ltd"
                      />
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="company-contact-name" className={styles.label}>
                        Contact person full name<span className={styles.req}>*</span>
                      </label>
                      <input
                        id="company-contact-name"
                        type="text"
                        name="full_name"
                        autoComplete="name"
                        className={styles.input}
                        value={form.full_name}
                        onChange={handleChange}
                        required
                        placeholder="e.g. Salim Rashid"
                      />
                    </div>
                  </div>

                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label htmlFor="company-phone" className={styles.label}>
                        Phone / WhatsApp number<span className={styles.req}>*</span>
                      </label>
                      <input
                        id="company-phone"
                        type="tel"
                        name="phone"
                        autoComplete="tel"
                        className={styles.input}
                        value={form.phone}
                        onChange={handleChange}
                        required
                        placeholder="+255 777 000 111"
                      />
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="company-email" className={styles.label}>
                        Official email<span className={styles.req}>*</span>
                      </label>
                      <input
                        id="company-email"
                        type="email"
                        name="email"
                        autoComplete="email"
                        className={styles.input}
                        value={form.email}
                        onChange={handleChange}
                        required
                        placeholder="info@company.co.tz"
                      />
                    </div>
                  </div>
                </div>

                <div className={styles.fieldsetGroup}>
                  <h2 className={styles.fieldsetHeading}>
                    <Car size={15} aria-hidden="true" />
                    Fleet &amp; operating details
                  </h2>

                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label htmlFor="company-business-type" className={styles.label}>
                        Business type
                      </label>
                      <select
                        id="company-business-type"
                        name="business_type"
                        className={styles.select}
                        value={form.business_type}
                        onChange={handleChange}
                      >
                        <option value="Private Hire Services">Private Hire Services</option>
                        <option value="Airport Transfer & VIP Chauffeur">
                          Airport Transfer &amp; VIP Chauffeur
                        </option>
                        <option value="Private Hire Fleet Operator">
                          Private Hire Fleet Operator
                        </option>
                        <option value="Bus & Minivan Hire">Coaster Bus &amp; Group Transit</option>
                      </select>
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="company-fleet-size" className={styles.label}>
                        Estimated fleet size
                      </label>
                      <select
                        id="company-fleet-size"
                        name="fleet_size"
                        className={styles.select}
                        value={form.fleet_size}
                        onChange={handleChange}
                      >
                        <option value="1-3 Vehicles">1 – 3 Vehicles</option>
                        <option value="4-10 Vehicles">4 – 10 Vehicles</option>
                        <option value="11-25 Vehicles">11 – 25 Vehicles</option>
                        <option value="25+ Vehicles">25+ Vehicles</option>
                      </select>
                    </div>
                  </div>

                  <div className={styles.fieldRow}>
                    <div className={styles.field}>
                      <label htmlFor="company-depot" className={styles.label}>
                        Base / depot location
                      </label>
                      <input
                        id="company-depot"
                        type="text"
                        name="depot_location"
                        className={styles.input}
                        value={form.depot_location}
                        onChange={handleChange}
                        placeholder="e.g. Stone Town / Airport Road / Nungwi"
                      />
                    </div>

                    <div className={styles.field}>
                      <label htmlFor="company-reg-ref" className={styles.label}>
                        Registration / license ref (optional)
                      </label>
                      <input
                        id="company-reg-ref"
                        type="text"
                        name="registration_reference"
                        className={styles.input}
                        value={form.registration_reference}
                        onChange={handleChange}
                        placeholder="e.g. BRELA / TIC # 104822"
                      />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="company-notes" className={styles.label}>
                      Vehicles &amp; service regions
                    </label>
                    <textarea
                      id="company-notes"
                      name="notes"
                      className={styles.textarea}
                      value={form.notes}
                      onChange={handleChange}
                      rows={4}
                      placeholder="List your vehicle types (Toyota Alphard, Prado 4x4, Coaster, etc.) and the Zanzibar regions you serve…"
                    />
                  </div>
                </div>

                <div className={styles.submitRow}>
                  <p className={styles.submitNote}>
                    <Shield size={15} aria-hidden="true" />
                    Reviewed directly by platform administrators
                  </p>
                  <button type="submit" disabled={submitting} className={styles.submitBtn}>
                    {submitting ? (
                      <>
                        <Loader2 size={17} className={styles.spin} aria-hidden="true" />
                        Submitting request…
                      </>
                    ) : (
                      <>
                        Submit company request
                        <ArrowRight size={16} aria-hidden="true" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </>
          )}
        </section>
      </div>
    </div>
  );
}
