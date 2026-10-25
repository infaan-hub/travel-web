"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { authAPI, profileAPI } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { Settings, Save, User, Mail, Camera, Trash2 } from '@/components/icons';

import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
import dashStyles from "@/features/pages/admin-dashboard.module.css";
export default function AdminSettingsPage() {
  const { isAuthenticated, isAdmin, user, loading: authLoading, refreshUser } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<{
    full_name: string;
    username: string;
    email: string;
    password: string;
  }>({
    full_name: "",
    username: user?.username || "",
    email: user?.email || "",
    password: "",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      profileAPI.get().then(res => {
        if (res.data.profile_image) setProfileImageUrl(res.data.profile_image);
        setForm((current) => ({
          ...current,
          full_name: res.data.full_name || "",
          username: user?.username || current.username,
          email: user?.email || current.email,
        }));
      }).catch(() => setMessage("Could not load your profile details."));
    }
  }, [authLoading, isAuthenticated, user?.email, user?.username]);

  if (!isAuthenticated || !isAdmin) return null;

  const handleSubmit = async (e: FormEvent<HTMLElement>) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await authAPI.updateUser({
        username: form.username,
        email: form.email,
        ...(form.password ? { password: form.password } : {}),
      });
      await profileAPI.update({ full_name: form.full_name });
      await refreshUser();
      setForm((current) => ({ ...current, password: "" }));
      setMessage('Settings saved successfully');
    } catch {
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (file) {
      setProfileImage(file);
      setProfileImageUrl(URL.createObjectURL(file));
    }
  };

  const handleUploadImage = async () => {
    if (!profileImage) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', profileImage);
      const res = await profileAPI.update(formData);
      setProfileImageUrl(res.data.profile_image);
      window.dispatchEvent(new Event('profile-updated'));
      setProfileImage(null);
      setMessage('Profile image updated successfully');
    } catch {
      setMessage('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    try {
      await profileAPI.removeImage();
      setProfileImageUrl(null);
      setProfileImage(null);
      window.dispatchEvent(new Event('profile-updated'));
      setMessage('Profile image removed');
    } catch {
      setMessage('Failed to remove image');
    }
  };

  return (
    <div className={dashStyles.dashboardRoot}>
      <header className={dashStyles.dashMasthead}>
        <div className={dashStyles.dashMastheadText}>
          <p className={dashStyles.dashEyebrow}>Admin workspace</p>
          <h1 className={dashStyles.dashTitle}>Settings</h1>
          <p className={dashStyles.dashLead}>Manage your account settings</p>
        </div>
      </header>

      <section className={dashStyles.dashPanel} aria-label="Settings">
        <div className={dashStyles.dashPanelHead}>
          <div className={dashStyles.dashPanelHeadMain}>
            <span className={dashStyles.dashPanelIcon} aria-hidden="true">
              <Settings size={17} />
            </span>
            <div>
              <h2 className={dashStyles.dashPanelTitle}>Account Settings</h2>
              <p className={dashStyles.dashPanelCopy}>Update your profile and credentials.</p>
            </div>
          </div>
        </div>
        <div className="admin-content" style={{ maxWidth: 600, margin: '0 auto' }}>
        {message && <div className={`alert ${message.includes('successfully') || message.includes('removed') ? 'alert-success' : 'alert-error'}`}>{message}</div>}

        <div className="profile-image-section" style={{ textAlign: 'center', marginBottom: 24 }}>
          <div className="profile-image-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
            {profileImageUrl ? (
              <img src={profileImageUrl} alt="Profile" style={{ width: 120, height: 120, borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              <div style={{ width: 120, height: 120, borderRadius: '50%', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 40, color: '#999' }}>
                {user?.username?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>
          <div style={{ marginTop: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              <Camera size={14} /> Choose Image
              <input type="file" accept="image/*" onChange={handleImageChange} style={{ display: 'none' }} />
            </label>
            {profileImage && (
              <button className="btn btn-primary" onClick={handleUploadImage} disabled={uploading}>
                {uploading ? 'Uploading...' : <><Save size={14} /> Upload</>}
              </button>
            )}
            {profileImageUrl && (
              <button className="btn btn-danger" onClick={handleRemoveImage}>
                <Trash2 size={14} /> Remove
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label><User size={14} /> Account name</label>
            <input type="text" value={form.full_name} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({...form, full_name: e.target.value})} />
          </div>
          <div className="form-group">
            <label><User size={14} /> Username</label>
            <input type="text" value={form.username} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({...form, username: e.target.value})} />
          </div>
          <div className="form-group">
            <label><Mail size={14} /> Email</label>
            <input type="email" value={form.email} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({...form, email: e.target.value})} />
          </div>
          <div className="form-group">
            <label>New password</label>
            <input
              type="password"
              autoComplete="new-password"
              minLength={8}
              value={form.password}
              onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({...form, password: e.target.value})}
              placeholder="Leave blank to keep your current password"
            />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}</button>
          </div>
        </form>
      </div>
      </section>
    </div>
  );
}