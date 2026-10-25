"use client";

import { useState } from 'react';
import Link from "next/link";
import api from '@/lib/api/client';
import { Building2, ClipboardList, CheckCircle } from '@/components/icons';

import { useToast } from "@/components/ToastProvider";
import { PageHero } from "@/components/PageHero";
import styles from "@/features/pages/contact-page.module.css";
import type { ChangeEvent, FormEvent } from "react";
export default function ContactPage() {
  const toast = useToast();
  const [form, setForm] = useState<{ name: string; email: string; phone: string; subject: string; message: string }>({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e: FormEvent<HTMLElement>) => {
    e.preventDefault();
    try {
      await api.post('/contact/', form);
      setSent(true);
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      toast.error('Failed to send message. Please try again.');
    }
  };

  return (
    <div className={`page contact-page ${styles.contactPageRoot}`}>
      <PageHero
        eyebrow="Travel. platform support"
        title="How can we help?"
        subtitle="Send a question about using the platform, finding a provider, or managing a booking request."
        backgroundImageKey="thumb"
        patternImageKey="zanzibar"
        ctaPrimary={{ label: "Browse companies", href: "/companies/" }}
        ctaSecondary={{ label: "View experiences", href: "/tours/" }}
      />

      <div className="contact-content">
        <div className="contact-info">
          <div className="contact-info-card">
            <h3><Building2 size={18} /> Looking for a tour provider?</h3>
            <p>Browse company profiles to find their published services and public contact details.</p>
            <Link href="/companies/" className="btn btn-secondary">Find a company</Link>
          </div>
          <div className="contact-info-card">
            <h3><ClipboardList size={18} /> About booking requests</h3>
            <p>Requests are sent to the company that publishes the selected experience. The provider follows up with availability and next steps.</p>
            <Link href="/bookings/" className="btn btn-secondary">My booking requests</Link>
          </div>
        </div>

        <div className="contact-form-container">
          {sent ? (
            <div className="success-message">
              <span className="success-icon"><CheckCircle size={32} /></span>
              <h3>Message Sent Successfully!</h3>
              <p>Your message has been sent to the Travel. support inbox.</p>
              <button className="btn btn-primary" onClick={() => setSent(false)}>
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Your Name *</label>
                  <input type="text" name="name" value={form.name} onChange={handleChange} required placeholder="John Doe" />
                </div>
                <div className="form-group">
                  <label>Your Email *</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="john@email.com" />
                </div>
              </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="Country code and phone number" />
                </div>
                <div className="form-group">
                  <label>Subject *</label>
                <input type="text" name="subject" value={form.subject} onChange={handleChange} required placeholder="How can we help?" />
              </div>
              <div className="form-group">
                <label>Message *</label>
                <textarea name="message" value={form.message} onChange={handleChange} required placeholder="Tell us about your travel plans..." rows={5} />
              </div>
              <button type="submit" className="btn btn-primary btn-block">
                Send Message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
