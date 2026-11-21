"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import api from "@/lib/api/client";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Clock,
  Send,
  Shield,
} from "@/components/icons";
import { useToast } from "@/components/ToastProvider";
import styles from "@/features/pages/contact-page.module.css";

const SUPPORT_TOPICS = [
  "Booking & airport transfer help",
  "Trip distance & fare estimate",
  "Account or booking changes",
  "Partnership inquiry",
] as const;

const INITIAL_INQUIRY_FORM = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
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

export default function ContactSupportPage() {
  const toast = useToast();
  const [form, setForm] = useState(INITIAL_INQUIRY_FORM);
  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormError("");
    setForm((current) => ({ ...current, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    try {
      setSubmitting(true);
      await api.post("/contact/", form);
      setSentMessage(
        "Your message has been delivered to our support inbox. A team member will review your inquiry and reply shortly.",
      );
      setForm(INITIAL_INQUIRY_FORM);
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err, "Failed to send message. Please try again.");
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

        <section className={styles.formCard} aria-label="General support form">
          {sentMessage ? (
            <div className={styles.successPanel} role="status" aria-live="polite">
              <span className={styles.successIcon} aria-hidden="true">
                <CheckCircle size={32} />
              </span>
              <h1 className={styles.successTitle}>Message sent to support</h1>
              <p className={styles.successCopy}>{sentMessage}</p>

              <div className={styles.successSteps}>
                <div className={styles.successStep}>
                  <strong>1. Logged with our team</strong>
                  <span>
                    Your inquiry is saved in our support queue with your return email.
                  </span>
                </div>
                <div className={styles.successStep}>
                  <strong>2. Direct follow-up</strong>
                  <span>
                    Expect a reply within 24 hours on the email or phone number you shared.
                  </span>
                </div>
              </div>

              <div className={styles.successActions}>
                <button
                  type="button"
                  className={styles.submitBtn}
                  onClick={() => setSentMessage(null)}
                >
                  Send another message
                </button>
                <Link href="/contact/" className={styles.secondaryLink}>
                  Back to contact
                </Link>
                <Link href="/trips/" className={styles.secondaryLink}>
                  Explore Zanzibar trips
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </div>
            </div>
          ) : (
            <>
              <header className={styles.formHeader}>
                <div className={styles.formHeaderCopy}>
                  <span className={styles.sectionEyebrow}>Support &amp; inquiries</span>
                  <h1 className={styles.formTitle}>Send us a message</h1>
                  <p className={styles.formSubtitle}>
                    Ask about private transfers, vehicle availability, Zanzibar trip planning, or
                    any booking question.
                  </p>
                </div>
                <span className={styles.slaBadge}>
                  <Clock size={13} aria-hidden="true" />
                  Reply within 24h
                </span>
              </header>

              <div className={styles.topicRow} role="group" aria-label="Quick subject suggestions">
                <span className={styles.topicLabel}>Quick topics:</span>
                {SUPPORT_TOPICS.map((topic) => {
                  const selected = form.subject === topic;
                  return (
                    <button
                      key={topic}
                      type="button"
                      className={`${styles.topicChip} ${selected ? styles.topicChipActive : ""}`}
                      aria-pressed={selected}
                      onClick={() =>
                        setForm((current) => ({ ...current, subject: topic }))
                      }
                    >
                      {topic}
                    </button>
                  );
                })}
              </div>

              <form onSubmit={handleSubmit} className={styles.form}>
                {formError ? (
                  <div className={styles.errorAlert} role="alert">
                    <AlertCircle size={18} aria-hidden="true" />
                    <span>{formError}</span>
                  </div>
                ) : null}

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label htmlFor="inquiry-name" className={styles.label}>
                      Your full name<span className={styles.req}>*</span>
                    </label>
                    <input
                      id="inquiry-name"
                      type="text"
                      name="name"
                      autoComplete="name"
                      maxLength={200}
                      className={styles.input}
                      value={form.name}
                      onChange={handleChange}
                      required
                      placeholder="e.g. Amina Hassan"
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="inquiry-email" className={styles.label}>
                      Email address<span className={styles.req}>*</span>
                    </label>
                    <input
                      id="inquiry-email"
                      type="email"
                      name="email"
                      autoComplete="email"
                      maxLength={254}
                      className={styles.input}
                      value={form.email}
                      onChange={handleChange}
                      required
                      placeholder="amina@example.com"
                    />
                  </div>
                </div>

                <div className={styles.fieldRow}>
                  <div className={styles.field}>
                    <label htmlFor="inquiry-phone" className={styles.label}>
                      Phone / WhatsApp (optional)
                    </label>
                    <input
                      id="inquiry-phone"
                      type="tel"
                      name="phone"
                      autoComplete="tel"
                      maxLength={20}
                      className={styles.input}
                      value={form.phone}
                      onChange={handleChange}
                      placeholder="+255 777 000 111"
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="inquiry-subject" className={styles.label}>
                      Subject<span className={styles.req}>*</span>
                    </label>
                    <input
                      id="inquiry-subject"
                      type="text"
                      name="subject"
                      maxLength={300}
                      className={styles.input}
                      value={form.subject}
                      onChange={handleChange}
                      required
                      placeholder="How can we help?"
                    />
                  </div>
                </div>

                <div className={styles.field}>
                  <div className={styles.fieldLabelRow}>
                    <label htmlFor="inquiry-message" className={styles.label}>
                      Message<span className={styles.req}>*</span>
                    </label>
                    <span className={styles.charHint}>{form.message.length} / 5000</span>
                  </div>
                  <textarea
                    id="inquiry-message"
                    name="message"
                    maxLength={5000}
                    className={styles.textarea}
                    value={form.message}
                    onChange={handleChange}
                    required
                    rows={5}
                    placeholder="Share your travel dates, pickup area, booking reference, or question so we can help quickly…"
                  />
                </div>

                <div className={styles.submitRow}>
                  <p className={styles.submitNote}>
                    <Shield size={15} aria-hidden="true" />
                    Sent directly to the Travel. support team
                  </p>
                  <button type="submit" disabled={submitting} className={styles.submitBtn}>
                    {submitting ? (
                      <>
                        <Loader2 size={17} className={styles.spin} aria-hidden="true" />
                        Sending message…
                      </>
                    ) : (
                      <>
                        <Send size={16} aria-hidden="true" />
                        Send message
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
