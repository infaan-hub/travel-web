"use client";

import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { Loader2, UserCheck } from "lucide-react";
import api, { partnerRequestsAPI } from "@/lib/api/client";
import {
  AlertCircle,
  ArrowRight,
  Building2,
  Car,
  CheckCircle,
  Clock,
  Compass,
  Mail,
  MessageSquare,
  Send,
  Shield,
} from "@/components/icons";
import { useToast } from "@/components/ToastProvider";
import { PageHero } from "@/components/PageHero";
import styles from "@/features/pages/contact-page.module.css";

type ContactTab = "inquiry" | "company";

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

export default function ContactPage() {
  const toast = useToast();
  const formPanelRef = useRef<HTMLDivElement | null>(null);

  const [activeTab, setActiveTab] = useState<ContactTab>("inquiry");
  const [inquiryForm, setInquiryForm] = useState(INITIAL_INQUIRY_FORM);
  const [companyForm, setCompanyForm] = useState(INITIAL_COMPANY_FORM);
  const [sentResult, setSentResult] = useState<{ tab: ContactTab; message: string } | null>(null);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get("tab")?.toLowerCase();
    const hash = window.location.hash.replace(/^#/, "").toLowerCase();
    if (tabParam === "company" || hash === "company" || hash === "company-registration") {
      setActiveTab("company"); // eslint-disable-line react-hooks/set-state-in-effect
    }
  }, []);

  const selectTab = (next: ContactTab, scrollToForm = false) => {
    setActiveTab(next);
    setSentResult(null);
    setFormError("");
    if (scrollToForm && formPanelRef.current) {
      formPanelRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleInquiryChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormError("");
    setInquiryForm((current) => ({ ...current, [e.target.name]: e.target.value }));
  };

  const handleCompanyChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setFormError("");
    setCompanyForm((current) => ({ ...current, [e.target.name]: e.target.value }));
  };

  const handleInquirySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    try {
      setSubmitting(true);
      await api.post("/contact/", inquiryForm);
      setSentResult({
        tab: "inquiry",
        message:
          "Your message has been delivered to our support inbox. A team member will review your inquiry and reply shortly.",
      });
      setInquiryForm(INITIAL_INQUIRY_FORM);
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err, "Failed to send message. Please try again.");
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompanySubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFormError("");
    try {
      setSubmitting(true);
      const res = await partnerRequestsAPI.submit({
        type: "COMPANY_REGISTRATION",
        ...companyForm,
      });
      setSentResult({
        tab: "company",
        message:
          res.data?.message ||
          "Your company registration request has been submitted. Our administration team will review your fleet details and get in touch.",
      });
      setCompanyForm(INITIAL_COMPANY_FORM);
    } catch (err: unknown) {
      const msg = extractApiErrorMessage(err, "Failed to submit company registration request.");
      setFormError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="contact-hub-root" className={`page ${styles.page}`}>
      <PageHero
        eyebrow="Support & partner onboarding"
        title="How can we help you today?"
        subtitle="Reach our Zanzibar support team for trip or booking help, register your transport company fleet, or apply to join our Public Hire Driver network."
        backgroundImageKey="thumb"
        patternImageKey="zanzibar"
        ctaPrimary={{ label: "Browse companies", href: "/companies/" }}
        ctaSecondary={{ label: "Plan & measure trips", href: "/trips/" }}
      >
        <div className={styles.heroStats}>
          <span className={styles.heroStatPill}>
            <strong>24h</strong> Typical support reply
          </span>
          <span className={styles.heroStatPill}>
            <strong>Verified</strong> Fleet &amp; driver onboarding
          </span>
          <span className={styles.heroStatPill}>
            <strong>Zanzibar</strong> &amp; Tanzania coverage
          </span>
        </div>
      </PageHero>

      <div className={styles.content}>
        {/* STEP 1: CHOOSE HOW TO REACH US */}
        <section className={styles.pathwaysSection} aria-labelledby="contact-pathways-heading">
          <span id="contact-pathways-heading" className={styles.sectionEyebrow}>
            <MessageSquare size={13} aria-hidden="true" />
            Choose your pathway
          </span>

          <div className={styles.pathwaysGrid}>
            <button
              type="button"
              className={`${styles.pathwayCard} ${
                activeTab === "inquiry" ? styles.pathwayCardActive : ""
              }`}
              aria-pressed={activeTab === "inquiry"}
              onClick={() => selectTab("inquiry", true)}
            >
              <div className={styles.pathwayTop}>
                <span className={styles.pathwayIcon} aria-hidden="true">
                  <Mail size={20} />
                </span>
                <span
                  className={`${styles.pathwayPill} ${
                    activeTab === "inquiry" ? styles.pathwayPillActive : ""
                  }`}
                >
                  {activeTab === "inquiry" ? "Active form" : "Travelers"}
                </span>
              </div>
              <h2 className={styles.pathwayTitle}>General Support &amp; Inquiries</h2>
              <p className={styles.pathwayDesc}>
                Questions about booking transfers, vehicle availability, custom Zanzibar routes, or
                your account.
              </p>
              <span className={styles.pathwayAction}>
                Message support
                <ArrowRight size={15} aria-hidden="true" />
              </span>
            </button>

            <button
              type="button"
              className={`${styles.pathwayCard} ${
                activeTab === "company" ? styles.pathwayCardActive : ""
              }`}
              aria-pressed={activeTab === "company"}
              onClick={() => selectTab("company", true)}
            >
              <div className={styles.pathwayTop}>
                <span className={styles.pathwayIcon} aria-hidden="true">
                  <Building2 size={20} />
                </span>
                <span
                  className={`${styles.pathwayPill} ${
                    activeTab === "company" ? styles.pathwayPillActive : ""
                  }`}
                >
                  {activeTab === "company" ? "Active form" : "Fleet owners"}
                </span>
              </div>
              <h2 className={styles.pathwayTitle}>Register Transport Company</h2>
              <p className={styles.pathwayDesc}>
                List your private-hire vehicles, publish curated trips, and manage bookings through
                a dedicated company workspace.
              </p>
              <span className={styles.pathwayAction}>
                Register company
                <ArrowRight size={15} aria-hidden="true" />
              </span>
            </button>

            <Link href="/request/driver/" className={styles.pathwayLinkCard}>
              <div className={styles.pathwayTop}>
                <span
                  className={`${styles.pathwayIcon} ${styles.pathwayIconEmerald}`}
                  aria-hidden="true"
                >
                  <UserCheck size={20} />
                </span>
                <span className={`${styles.pathwayPill} ${styles.pathwayPillEmerald}`}>
                  Dedicated form
                </span>
              </div>
              <h2 className={styles.pathwayTitle}>Join as Public Hire Driver</h2>
              <p className={styles.pathwayDesc}>
                Licensed driver with ZanID, NIDA, or Passport? Submit your credentials for admin
                approval and direct trip dispatch.
              </p>
              <span className={styles.pathwayAction}>
                Apply as driver
                <ArrowRight size={15} aria-hidden="true" />
              </span>
            </Link>
          </div>
        </section>

        {/* STEP 2: ACTIVE FORM WORKSPACE + EXPECTATIONS SIDEBAR */}
        <div className={styles.workspaceGrid}>
          <section
            id="contact-form-panel"
            ref={formPanelRef}
            className={styles.formCard}
            aria-label={
              activeTab === "company" ? "Company registration form" : "General support form"
            }
          >
            {/* Segmented Mode Switcher */}
            <div className={styles.tabBar} role="tablist" aria-label="Request type">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "inquiry"}
                className={`${styles.tabBtn} ${activeTab === "inquiry" ? styles.tabBtnActive : ""}`}
                onClick={() => selectTab("inquiry")}
              >
                <Mail size={16} aria-hidden="true" />
                General Support
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === "company"}
                className={`${styles.tabBtn} ${activeTab === "company" ? styles.tabBtnActive : ""}`}
                onClick={() => selectTab("company")}
              >
                <Building2 size={16} aria-hidden="true" />
                Company Registration
              </button>
            </div>

            {sentResult ? (
              <div className={styles.successPanel} role="status" aria-live="polite">
                <span className={styles.successIcon} aria-hidden="true">
                  <CheckCircle size={32} />
                </span>
                <h2 className={styles.successTitle}>
                  {sentResult.tab === "company"
                    ? "Company request received"
                    : "Message sent to support"}
                </h2>
                <p className={styles.successCopy}>{sentResult.message}</p>

                <div className={styles.successSteps}>
                  <div className={styles.successStep}>
                    <strong>1. Logged with our team</strong>
                    <span>
                      {sentResult.tab === "company"
                        ? "Your fleet & contact details are queued for admin onboarding review."
                        : "Your inquiry is saved in our support queue with your return email."}
                    </span>
                  </div>
                  <div className={styles.successStep}>
                    <strong>2. Direct follow-up</strong>
                    <span>
                      {sentResult.tab === "company"
                        ? "We will reach out via phone or email to finalize your company profile."
                        : "Expect a reply within 24 hours on the email or phone number you shared."}
                    </span>
                  </div>
                </div>

                <div className={styles.successActions}>
                  <button
                    type="button"
                    className={styles.submitBtn}
                    onClick={() => setSentResult(null)}
                  >
                    Submit another request
                  </button>
                  <Link
                    href={sentResult.tab === "company" ? "/companies/" : "/trips/"}
                    className={styles.secondaryLink}
                  >
                    {sentResult.tab === "company" ? "View listed companies" : "Explore Zanzibar trips"}
                    <ArrowRight size={15} aria-hidden="true" />
                  </Link>
                </div>
              </div>
            ) : activeTab === "inquiry" ? (
              <>
                <header className={styles.formHeader}>
                  <div className={styles.formHeaderCopy}>
                    <span className={styles.sectionEyebrow}>Support &amp; inquiries</span>
                    <h2 className={styles.formTitle}>Send us a message</h2>
                    <p className={styles.formSubtitle}>
                      Ask about private transfers, vehicle availability, trip planning, or any
                      booking question.
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
                    const selected = inquiryForm.subject === topic;
                    return (
                      <button
                        key={topic}
                        type="button"
                        className={`${styles.topicChip} ${selected ? styles.topicChipActive : ""}`}
                        aria-pressed={selected}
                        onClick={() =>
                          setInquiryForm((current) => ({ ...current, subject: topic }))
                        }
                      >
                        {topic}
                      </button>
                    );
                  })}
                </div>

                <form onSubmit={handleInquirySubmit} className={styles.form} noValidate={false}>
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
                        value={inquiryForm.name}
                        onChange={handleInquiryChange}
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
                        value={inquiryForm.email}
                        onChange={handleInquiryChange}
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
                        value={inquiryForm.phone}
                        onChange={handleInquiryChange}
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
                        value={inquiryForm.subject}
                        onChange={handleInquiryChange}
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
                      <span className={styles.charHint}>
                        {inquiryForm.message.length} / 5000
                      </span>
                    </div>
                    <textarea
                      id="inquiry-message"
                      name="message"
                      maxLength={5000}
                      className={styles.textarea}
                      value={inquiryForm.message}
                      onChange={handleInquiryChange}
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
                    <button
                      type="submit"
                      disabled={submitting}
                      className={styles.submitBtn}
                    >
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
            ) : (
              <>
                <header className={styles.formHeader}>
                  <div className={styles.formHeaderCopy}>
                    <span className={styles.sectionEyebrow}>Company onboarding</span>
                    <h2 className={styles.formTitle}>Register your transport company</h2>
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

                <form onSubmit={handleCompanySubmit} className={styles.form}>
                  {formError ? (
                    <div className={styles.errorAlert} role="alert">
                      <AlertCircle size={18} aria-hidden="true" />
                      <span>{formError}</span>
                    </div>
                  ) : null}

                  <div className={styles.fieldsetGroup}>
                    <h3 className={styles.fieldsetHeading}>
                      <Building2 size={15} aria-hidden="true" />
                      Company &amp; primary contact
                    </h3>

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
                          value={companyForm.company_name}
                          onChange={handleCompanyChange}
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
                          value={companyForm.full_name}
                          onChange={handleCompanyChange}
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
                          value={companyForm.phone}
                          onChange={handleCompanyChange}
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
                          value={companyForm.email}
                          onChange={handleCompanyChange}
                          required
                          placeholder="info@company.co.tz"
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.fieldsetGroup}>
                    <h3 className={styles.fieldsetHeading}>
                      <Car size={15} aria-hidden="true" />
                      Fleet &amp; operating details
                    </h3>

                    <div className={styles.fieldRow}>
                      <div className={styles.field}>
                        <label htmlFor="company-business-type" className={styles.label}>
                          Business type
                        </label>
                        <select
                          id="company-business-type"
                          name="business_type"
                          className={styles.select}
                          value={companyForm.business_type}
                          onChange={handleCompanyChange}
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
                          value={companyForm.fleet_size}
                          onChange={handleCompanyChange}
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
                          value={companyForm.depot_location}
                          onChange={handleCompanyChange}
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
                          value={companyForm.registration_reference}
                          onChange={handleCompanyChange}
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
                        value={companyForm.notes}
                        onChange={handleCompanyChange}
                        rows={4}
                        placeholder="List your vehicle types (Toyota Alphard, Prado 4x4, Coaster, etc.) and the Zanzibar or mainland regions you serve…"
                      />
                    </div>
                  </div>

                  <div className={styles.submitRow}>
                    <p className={styles.submitNote}>
                      <Shield size={15} aria-hidden="true" />
                      Reviewed directly by platform administrators
                    </p>
                    <button
                      type="submit"
                      disabled={submitting}
                      className={styles.submitBtn}
                    >
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

          {/* STICKY SUPPORT EXPECTATIONS & SHORTCUTS SIDEBAR */}
          <aside className={styles.sidebar} aria-label="Support expectations and quick links">
            <div className={`${styles.sideCard} ${styles.sideCardTinted}`}>
              <span className={styles.sectionEyebrow}>What to expect</span>
              <h3 className={styles.sideTitle}>How requests are handled</h3>
              <ul className={styles.expectList}>
                <li className={styles.expectItem}>
                  <span className={styles.expectIcon} aria-hidden="true">
                    <Clock size={16} />
                  </span>
                  <div className={styles.expectCopy}>
                    <strong>Fast traveler support</strong>
                    <span>
                      General inquiries go straight to our support desk, typically answered within
                      24 hours.
                    </span>
                  </div>
                </li>
                <li className={styles.expectItem}>
                  <span className={styles.expectIcon} aria-hidden="true">
                    <Building2 size={16} />
                  </span>
                  <div className={styles.expectCopy}>
                    <strong>Company account verification</strong>
                    <span>
                      Our admin team verifies your fleet &amp; contact details before publishing
                      your directory profile.
                    </span>
                  </div>
                </li>
                <li className={styles.expectItem}>
                  <span className={styles.expectIcon} aria-hidden="true">
                    <UserCheck size={16} />
                  </span>
                  <div className={styles.expectCopy}>
                    <strong>Licensed driver onboarding</strong>
                    <span>
                      Drivers apply with ZanID, NIDA, or Passport via the dedicated driver form to
                      activate their account.
                    </span>
                  </div>
                </li>
              </ul>
            </div>

            <div className={styles.sideCard}>
              <span className={styles.sectionEyebrow}>Quick links</span>
              <h3 className={styles.sideTitle}>Looking to book right away?</h3>
              <p className={styles.sideLead}>
                Explore live routes, verified fleets, or submit a driver application directly.
              </p>
              <nav className={styles.shortcutList} aria-label="Quick destination links">
                <Link href="/trips/" className={styles.shortcutLink}>
                  <span className={styles.shortcutLeft}>
                    <Compass size={16} aria-hidden="true" />
                    Measure &amp; explore Zanzibar trips
                  </span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link href="/transport/" className={styles.shortcutLink}>
                  <span className={styles.shortcutLeft}>
                    <Car size={16} aria-hidden="true" />
                    Browse private-hire vehicles
                  </span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link href="/companies/" className={styles.shortcutLink}>
                  <span className={styles.shortcutLeft}>
                    <Building2 size={16} aria-hidden="true" />
                    Compare verified companies
                  </span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
                <Link href="/request/driver/" className={styles.shortcutLink}>
                  <span className={styles.shortcutLeft}>
                    <UserCheck size={16} aria-hidden="true" />
                    Apply as Public Hire Driver
                  </span>
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              </nav>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
