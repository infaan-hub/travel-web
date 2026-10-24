"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { authAPI, profileAPI } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { Settings, Save, User, Mail, Phone, MapPin, Camera, Trash2, X, AlertCircle } from '@/components/icons';

import type {  Customer  } from "@/features/pages/types";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
export default function ProfilePage() {
  const { isAuthenticated, user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [profile, setProfile] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [credentialsUsernameOverride, setCredentialsUsernameOverride] = useState<string | null>(null);
  const credentialsUsername = credentialsUsernameOverride ?? user?.username ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [savingCredentials, setSavingCredentials] = useState(false);

  const [form, setForm] = useState<{
    full_name: string;
    email: string;
    phone: string;
    address: string;
  }>({
    full_name: '',
    email: '',
    phone: '',
    address: '',
  });

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) { router.push('/login'); return; }
    loadProfile();
  }, [authLoading, isAuthenticated]);

  const loadProfile = async () => {
    try {
      const res = await profileAPI.get();
      setProfile(res.data);
      setForm({
        full_name: res.data.full_name || '',
        email: res.data.email || user?.email || '',
        phone: res.data.phone || '',
        address: res.data.address || '',
      });
      if (res.data.profile_image) setImagePreview(res.data.profile_image);
    } catch {
      showMessage('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text: string, type = 'success') => {
    setMessage(text);
    setMessageType(type);
    setTimeout(() => setMessage(''), 4000);
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setDirty(true);
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      showMessage('Invalid format. Use JPG, PNG, or WEBP.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      showMessage('Image too large. Max 5MB.', 'error');
      return;
    }
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setDirty(true);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('full_name', form.full_name);
      fd.append('email', form.email);
      fd.append('phone', form.phone);
      fd.append('address', form.address);
      if (imageFile) fd.append('image', imageFile);
      const res = await profileAPI.update(fd);
      setProfile(res.data);
      setImageFile(null);
      setDirty(false);
      await refreshUser();
      window.dispatchEvent(new Event('profile-updated'));
      showMessage('Profile updated successfully');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to save profile';
      showMessage(msg, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleCredentialsSave = async () => {
    if (newPassword && newPassword.length < 8) {
      showMessage('New password must be at least 8 characters', 'error');
      return;
    }
    setSavingCredentials(true);
    try {
      await authAPI.updateUser({
        username: credentialsUsername,
        ...(newPassword ? { password: newPassword } : {}),
      });
      await refreshUser();
      setCredentialsUsernameOverride(null);
      setNewPassword('');
      showMessage('Account details updated successfully');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.response?.data?.message || 'Failed to update account details';
      showMessage(msg, 'error');
    } finally {
      setSavingCredentials(false);
    }
  };

  const handleCancel = () => {
    loadProfile();
    setDirty(false);
  };

  if (!isAuthenticated) return null;

  if (loading) return <div className="page"><div className="page-loading">Loading...</div></div>;

  return (
    <div className="page profile-page">
      <div className="page-header">
        <h1><Settings size={24} /> Settings</h1>
        <p>Manage your profile information</p>
      </div>

      <div className="profile-content" style={{ maxWidth: 640, margin: '0 auto' }}>
        {message && (
          <div className={`alert ${messageType === 'success' ? 'alert-success' : 'alert-error'}`}>
            <AlertCircle size={16} /> {message}
          </div>
        )}

        <div className="profile-card">
          <div className="profile-image-section">
            <div className="profile-avatar-wrapper">
              {imagePreview ? (
                <img src={imagePreview} alt="Profile" className="profile-avatar" />
              ) : (
                <div className="profile-avatar profile-avatar-placeholder">
                  {form.full_name?.[0]?.toUpperCase() || user?.username?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
              <label className="profile-camera-btn">
                <Camera size={16} />
                <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageChange} />
              </label>
              {imagePreview && (
                <button className="profile-remove-btn" onClick={removeImage} type="button">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
            <p className="profile-image-hint">JPG, PNG or WEBP. Max 5MB.</p>
          </div>

          <form className="profile-form" onSubmit={(e: FormEvent<HTMLElement>) => { e.preventDefault(); handleSave(); }}>
            <div className="form-group">
              <label><User size={14} /> Full Name</label>
              <input type="text" name="full_name" value={form.full_name} onChange={handleChange} placeholder="Enter your full name" />
            </div>

            <div className="form-group">
              <label><Mail size={14} /> Email Address</label>
              <input type="email" name="email" value={form.email} onChange={handleChange} placeholder="Enter your email" />
            </div>

            <div className="form-group">
              <label><Phone size={14} /> Phone Number</label>
              <input type="tel" name="phone" value={form.phone} onChange={handleChange} placeholder="+255..." />
            </div>

            <div className="form-group">
              <label><MapPin size={14} /> Address</label>
              <textarea name="address" value={form.address} onChange={handleChange} placeholder="Enter your address" rows={3} />
            </div>

            <div className="form-actions">
              <button type="submit" className="btn btn-primary" disabled={saving || !dirty}>
                <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
              </button>
              {dirty && (
                <button type="button" className="btn btn-secondary" onClick={handleCancel}>
                  <X size={16} /> Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        {user?.account_type === 'TOUR_COMPANY' && (
          <div className="profile-card" style={{ marginTop: 20 }}>
            <h2>Login and security</h2>
            <div className="profile-form">
              <div className="form-group">
                <label><User size={14} /> Username</label>
                <input
                  type="text"
                  value={credentialsUsername}
                  onChange={(event) => setCredentialsUsernameOverride(event.target.value)}
                  autoComplete="username"
                  minLength={3}
                  maxLength={150}
                />
              </div>
              <div className="form-group">
                <label><Settings size={14} /> New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="Leave blank to keep your current password"
                  autoComplete="new-password"
                  minLength={8}
                />
              </div>
              <div className="form-actions">
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={savingCredentials || (!newPassword && credentialsUsername === user.username) || credentialsUsername.length < 3 || Boolean(newPassword && newPassword.length < 8)}
                  onClick={handleCredentialsSave}
                >
                  <Save size={16} /> {savingCredentials ? 'Saving...' : 'Update account'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}