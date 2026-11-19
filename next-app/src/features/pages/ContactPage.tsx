"use client";

import { useState, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import api, { partnerRequestsAPI } from "@/lib/api/client";
import { Building2, ClipboardList, CheckCircle, Car, User, Mail, Phone, Shield } from "@/components/icons";
import { UserCheck, ShieldCheck } from "lucide-react";
import { useToast } from "@/components/ToastProvider";
import { PageHero } from "@/components/PageHero";
import styles from "@/features/pages/contact-page.module.css";

type TabMode = "inquiry" | "company" | "driver" | null;

export default function ContactPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<TabMode>(null);

  // General Inquiry form
  const [inquiryForm, setInquiryForm] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  // Company Registration request form
  const [companyForm, setCompanyForm] = useState({
    company_name: "",
    full_name: "",
    phone: "",
    email: "",
    business_type: "Private Hire Services",
    registration_reference: "",
    depot_location: "",
    fleet_size: "1-5 Vehicles",
    notes: "",
  });

  // Public Hire Driver request form
  const [driverForm, setDriverForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    license_number: "",
    id_type: "ZAN_ID",
    id_number: "",
    experience: "3-5 years",
    languages: "English, Swahili",
    vehicle_info: "",
    notes: "",
  });

  const [sentMessage, setSentMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleInquiryChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setInquiryForm({ ...inquiryForm, [e.target.name]: e.target.value });
  };

  const handleCompanyChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setCompanyForm({ ...companyForm, [e.target.name]: e.target.value });
  };

  const handleDriverChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setDriverForm({ ...driverForm, [e.target.name]: e.target.value });
  };

  const handleInquirySubmit = async (e: FormEvent<HTMLElement>) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await api.post("/contact/", inquiryForm);
      setSentMessage("Your message has been sent to our support inbox. We will get back to you shortly.");
      setInquiryForm({ name: "", email: "", phone: "", subject: "", message: "" });
    } catch {
      toast.error("Failed to send message. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleCompanySubmit = async (e: FormEvent<HTMLElement>) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await partnerRequestsAPI.submit({
        type: "COMPANY_REGISTRATION",
        ...companyForm,
      });
      setSentMessage(
        res.data?.message ||
          "Company registration request submitted! The administration team has received your information and will register your company.",
      );
      setCompanyForm({
        company_name: "",
        full_name: "",
        phone: "",
        email: "",
        business_type: "Private Hire Services",
        registration_reference: "",
        depot_location: "",
        fleet_size: "1-5 Vehicles",
        notes: "",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit company request";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDriverSubmit = async (e: FormEvent<HTMLElement>) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await partnerRequestsAPI.submit({
        type: "PUBLIC_DRIVER_REGISTRATION",
        ...driverForm,
      });
      setSentMessage(
        res.data?.message ||
          "Driver application submitted! The administration team will verify your driving license and ID to register you as a Public Hire Driver.",
      );
      setDriverForm({
        full_name: "",
        phone: "",
        email: "",
        license_number: "",
        id_type: "ZAN_ID",
        id_number: "",
        experience: "3-5 years",
        languages: "English, Swahili",
        vehicle_info: "",
        notes: "",
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to submit driver application";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={`page contact-page ${styles.contactPageRoot}`}>
      <PageHero
        eyebrow="Private Hire Transport Platform"
        title="Partner Registration & Support"
        subtitle="Register your transport company fleet, apply as a verified Public Hire Driver, or contact platform support."
        backgroundImageKey="thumb"
        patternImageKey="zanzibar"
        ctaPrimary={{ label: "View Transport Fleets", href: "/companies/" }}
        ctaSecondary={{ label: "Plan a Trip Transfer", href: "/trips/" }}
      />

      <div className={styles.content}>
        <div className={`contact-content ${styles.contactContent}`}>
          {/* Left Cards */}
          <div className={`contact-info ${styles.contactInfo}`}>
            <div
              className={`contact-info-card ${styles.infoCard}`}
              style={{ cursor: "pointer" }}
              onClick={() => {
                setActiveTab("company");
                setSentMessage(null);
              }}
            >
              <h3>
                <span className={styles.infoIcon}>
                  <Building2 size={18} />
                </span>
                Transport & Car Rental Companies
              </h3>
              <p>
                Want to register your vehicle fleet, manage Private Hire vehicles, and dispatch trips to drivers? Submit a company request to join.
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setActiveTab("company");
                  setSentMessage(null);
                }}
              >
                Register Company
              </button>
            </div>

            <Link href="/request/driver/" className={`contact-info-card ${styles.infoCard}`}>
              <h3>
                <span className={styles.infoIcon}>
                  <UserCheck size={18} />
                </span>
                Join as Public Hire Driver
              </h3>
              <p>
                Are you a licensed driver with ZanID, NIDA or Passport? After admin approval, receive direct customer requests and trips companies choose to share.
              </p>
              <span className="btn btn-secondary">
                Apply as Driver
              </span>
            </Link>

            <div
              className={`contact-info-card ${styles.infoCard}`}
              style={{ cursor: "pointer" }}
              onClick={() => {
                setActiveTab("inquiry");
                setSentMessage(null);
              }}
            >
              <h3>
                <span className={styles.infoIcon}>
                  <Mail size={18} />
                </span>
                General Support & Inquiries
              </h3>
              <p>Questions about booking transfers, vehicle availability, or platform assistance.</p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setActiveTab("inquiry");
                  setSentMessage(null);
                }}
              >
                Contact Support
              </button>
            </div>
          </div>

          {/* Right Form Container */}
          <div className={`contact-form-container ${styles.formCard}`}>
            {/* Tab Selector */}
            <div className={styles.requestTabs}>
              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === "company" ? styles.tabBtnActive : ""}`}
                onClick={() => {
                  setActiveTab("company");
                  setSentMessage(null);
                }}
              >
                <Building2 size={15} /> Company Registration
              </button>

              <button
                type="button"
                className={`${styles.tabBtn} ${activeTab === "inquiry" ? styles.tabBtnActive : ""}`}
                onClick={() => {
                  setActiveTab("inquiry");
                  setSentMessage(null);
                }}
              >
                <Mail size={15} /> General Support
              </button>
            </div>

            {sentMessage ? (
              <div className={`success-message ${styles.successMessage}`}>
                <span className={`success-icon ${styles.successIcon}`}>
                  <CheckCircle size={36} color="#0e7c5a" />
                </span>
                <h3>Request Sent Successfully!</h3>
                <p>{sentMessage}</p>
                <button
                  className="btn btn-primary"
                  onClick={() => setSentMessage(null)}
                >
                  Submit Another Request
                </button>
              </div>
            ) : activeTab === "company" ? (
              /* ================= 1. Company Registration Form ================= */
              <>
                <div className={styles.formHead}>
                  <span className={styles.kicker}>Company Registration</span>
                  <h2>Register Your Transport Company</h2>
                  <p>
                    Fill in your company and fleet information. This details will be sent directly to the administration team to review and register your company account.
                  </p>
                </div>

                <form onSubmit={handleCompanySubmit} className="contact-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Company Name *</label>
                      <input
                        type="text"
                        name="company_name"
                        value={companyForm.company_name}
                        onChange={handleCompanyChange}
                        required
                        placeholder="e.g. Zanzibar Executive Fleets Ltd"
                      />
                    </div>
                    <div className="form-group">
                      <label>Contact Person Full Name *</label>
                      <input
                        type="text"
                        name="full_name"
                        value={companyForm.full_name}
                        onChange={handleCompanyChange}
                        required
                        placeholder="e.g. Salim Rashid"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Phone / WhatsApp Number *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={companyForm.phone}
                        onChange={handleCompanyChange}
                        required
                        placeholder="+255 777 000 111"
                      />
                    </div>
                    <div className="form-group">
                      <label>Official Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={companyForm.email}
                        onChange={handleCompanyChange}
                        required
                        placeholder="info@company.co.tz"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Business Type</label>
                      <select
                        name="business_type"
                        className={styles.selectInput}
                        value={companyForm.business_type}
                        onChange={handleCompanyChange}
                      >
                        <option value="Private Hire Services">Private Hire Services</option>
                        <option value="Airport Transfer & VIP Chauffeur">Airport Transfer & VIP Chauffeur</option>
                        <option value="Private Hire Fleet Operator">Private Hire Fleet Operator</option>
                        <option value="Bus & Minivan Hire">Coaster Bus & Group Transit</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Estimated Fleet Size</label>
                      <select
                        name="fleet_size"
                        className={styles.selectInput}
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

                  <div className="form-row">
                    <div className="form-group">
                      <label>Base / Depot Location</label>
                      <input
                        type="text"
                        name="depot_location"
                        value={companyForm.depot_location}
                        onChange={handleCompanyChange}
                        placeholder="e.g. Stone Town / Airport Road / Nungwi"
                      />
                    </div>
                    <div className="form-group">
                      <label>Registration / License Ref (Optional)</label>
                      <input
                        type="text"
                        name="registration_reference"
                        value={companyForm.registration_reference}
                        onChange={handleCompanyChange}
                        placeholder="e.g. BRELA / TIC # 104822"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Additional Notes & Vehicles to Register</label>
                    <textarea
                      name="notes"
                      value={companyForm.notes}
                      onChange={handleCompanyChange}
                      placeholder="Mention the types of vehicles you operate (Toyota Alphard, Prado 4x4, Coaster, etc.) and your preferred service regions..."
                      rows={4}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary btn-block"
                  >
                    {submitting ? "Sending to Admin..." : "Submit Company Request to Admin"}
                  </button>
                </form>
              </>
            ) : activeTab === "driver" ? (
              /* ================= 2. Driver Application Form ================= */
              <>
                <div className={styles.formHead}>
                  <span className={styles.kicker}>Driver Application</span>
                  <h2>Join as Public Hire Driver</h2>
                  <p>
                    Licensed drivers can apply here. Your credentials will be sent to the administrator to verify and register you as a Public Hire Driver, enabling you to take public transport requests.
                  </p>
                </div>

                <form onSubmit={handleDriverSubmit} className="contact-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Driver Full Name *</label>
                      <input
                        type="text"
                        name="full_name"
                        value={driverForm.full_name}
                        onChange={handleDriverChange}
                        required
                        placeholder="e.g. Hamisi Bakari Juma"
                      />
                    </div>
                    <div className="form-group">
                      <label>Phone / WhatsApp Number *</label>
                      <input
                        type="tel"
                        name="phone"
                        value={driverForm.phone}
                        onChange={handleDriverChange}
                        required
                        placeholder="+255 777 888 999"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={driverForm.email}
                        onChange={handleDriverChange}
                        placeholder="driver@example.com"
                      />
                    </div>
                    <div className="form-group">
                      <label>Driving License Number *</label>
                      <input
                        type="text"
                        name="license_number"
                        value={driverForm.license_number}
                        onChange={handleDriverChange}
                        required
                        placeholder="e.g. DL-ZN-49120"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>ID Document Type *</label>
                      <select
                        name="id_type"
                        className={styles.selectInput}
                        value={driverForm.id_type}
                        onChange={handleDriverChange}
                      >
                        <option value="ZAN_ID">ZanID (Zanzibar Resident ID)</option>
                        <option value="NIDA">NIDA (National Identification Number)</option>
                        <option value="PASSPORT">Passport</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>ID / Passport Number *</label>
                      <input
                        type="text"
                        name="id_number"
                        value={driverForm.id_number}
                        onChange={handleDriverChange}
                        required
                        placeholder="e.g. 19850312-32100-00001-18"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Driving Experience</label>
                      <select
                        name="experience"
                        className={styles.selectInput}
                        value={driverForm.experience}
                        onChange={handleDriverChange}
                      >
                        <option value="1-2 years">1 – 2 years</option>
                        <option value="3-5 years">3 – 5 years</option>
                        <option value="5-10 years">5 – 10 years</option>
                        <option value="10+ years">10+ years</option>
                      </select>
                    </div>

                    <div className="form-group">
                      <label>Spoken Languages</label>
                      <input
                        type="text"
                        name="languages"
                        value={driverForm.languages}
                        onChange={handleDriverChange}
                        placeholder="e.g. English, Swahili, Italian"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Own Vehicle Information (If applicable)</label>
                    <input
                      type="text"
                      name="vehicle_info"
                      value={driverForm.vehicle_info}
                      onChange={handleDriverChange}
                      placeholder="e.g. Toyota Noah (Plate Z 441 AB) or leave blank if freelance driver"
                    />
                  </div>

                  <div className="form-group">
                    <label>Experience & Route Expertise Notes</label>
                    <textarea
                      name="notes"
                      value={driverForm.notes}
                      onChange={handleDriverChange}
                      placeholder="Tell us about your driving experience with airport transfers, private journeys, or long-distance routes..."
                      rows={3}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary btn-block"
                  >
                    {submitting ? "Sending Application..." : "Submit Driver Application to Admin"}
                  </button>
                </form>
              </>
            ) : activeTab === "inquiry" ? (
              <>
                <div className={styles.formHead}>
                  <span className={styles.kicker}>Support & Inquiries</span>
                  <h2>We&apos;re here to help</h2>
                  <p>Send a question about vehicle transport, booking transfers, or platform help.</p>
                </div>

                <form onSubmit={handleInquirySubmit} className="contact-form">
                  <div className="form-row">
                    <div className="form-group">
                      <label>Your Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={inquiryForm.name}
                        onChange={handleInquiryChange}
                        required
                        placeholder="John Doe"
                      />
                    </div>
                    <div className="form-group">
                      <label>Your Email *</label>
                      <input
                        type="email"
                        name="email"
                        value={inquiryForm.email}
                        onChange={handleInquiryChange}
                        required
                        placeholder="john@email.com"
                      />
                    </div>
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label>Phone</label>
                      <input
                        type="tel"
                        name="phone"
                        value={inquiryForm.phone}
                        onChange={handleInquiryChange}
                        placeholder="Country code and phone number"
                      />
                    </div>
                    <div className="form-group">
                      <label>Subject *</label>
                      <input
                        type="text"
                        name="subject"
                        value={inquiryForm.subject}
                        onChange={handleInquiryChange}
                        required
                        placeholder="How can we help?"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label>Message *</label>
                    <textarea
                      name="message"
                      value={inquiryForm.message}
                      onChange={handleInquiryChange}
                      required
                      placeholder="Tell us about your questions or travel transport plans..."
                      rows={5}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn btn-primary btn-block"
                  >
                    {submitting ? "Sending..." : "Send Message"}
                  </button>
                </form>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
