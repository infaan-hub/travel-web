import { useState } from 'react';
import api from '../api/axios';
import { MapPin, Phone, Mail, Clock, CheckCircle } from 'lucide-react';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/contact/', form);
      setSent(true);
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (err) {
      alert('Failed to send message. Please try again.');
    }
  };

  return (
    <div className="page contact-page">
      <div className="page-header">
        <h1>Contact Us</h1>
        <p>We'd love to hear from you. Get in touch with our travel experts.</p>
      </div>

      <div className="contact-content">
        <div className="contact-info">
          <div className="contact-info-card">
            <h3><MapPin size={18} /> Location</h3>
            <p>Zanzibar, Tanzania<br/>East Africa</p>
          </div>
          <div className="contact-info-card">
            <h3><Phone size={18} /> Phone</h3>
            <p>+255711252758</p>
          </div>
          <div className="contact-info-card">
            <h3><Mail size={18} /> Email</h3>
            <p>infaanhameed@gmail.com</p>
          </div>
          <div className="contact-info-card">
            <h3><Clock size={18} /> Working Hours</h3>
            <p>Mon - Sat: 8:00 AM - 6:00 PM<br/>Sun: 9:00 AM - 2:00 PM</p>
          </div>
        </div>

        <div className="contact-form-container">
          {sent ? (
            <div className="success-message">
              <span className="success-icon"><CheckCircle size={32} /></span>
              <h3>Message Sent Successfully!</h3>
              <p>We'll get back to you within 24 hours.</p>
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
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+255711252758" />
                </div>
                <div className="form-group">
                  <label>Subject *</label>
                <input type="text" name="subject" value={form.subject} onChange={handleChange} required placeholder="How can we help?" />
              </div>
              <div className="form-group">
                <label>Message *</label>
                <textarea name="message" value={form.message} onChange={handleChange} required placeholder="Tell us about your travel plans..." rows="5" />
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
