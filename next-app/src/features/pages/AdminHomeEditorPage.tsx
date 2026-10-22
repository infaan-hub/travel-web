"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { homeSettingsAPI } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { Save, Upload, Trash2, Eye, Image as ImageIcon } from '@/components/icons';
import { getImageUrl } from '@/lib/utils/image-url';

import type {  HomeSettings  } from "@/features/pages/types";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
export default function AdminHomeEditorPage() {
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [settings, setSettings] = useState<HomeSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [zanzibarFile, setZanzibarFile] = useState<File | null>(null);
  const [zanzibarPreview, setZanzibarPreview] = useState<string | null>(null);
  const [tanzaniaFile, setTanzaniaFile] = useState<File | null>(null);
  const [tanzaniaPreview, setTanzaniaPreview] = useState<string | null>(null);
  const [moreExperiencesFile, setMoreExperiencesFile] = useState<File | null>(null);
  const [moreExperiencesPreview, setMoreExperiencesPreview] = useState<string | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) { router.push('/admin/login'); return; }
    loadSettings();
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const loadSettings = async () => {
    try {
      const res = await homeSettingsAPI.get();
      setSettings(res.data);
    } catch { console.error('Failed to load home settings'); }
    finally { setLoading(false); }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>, setFile: any, setPreview: any) => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = (ev: ProgressEvent<FileReader>) => setPreview(String(ev.target?.result ?? ''));
    reader.readAsDataURL(file);
  };

  const clearField = (field: string) => {
    if (field === 'hero') { setHeroFile(null); setHeroPreview(null); }
    else if (field === 'zanzibar') { setZanzibarFile(null); setZanzibarPreview(null); }
    else if (field === 'tanzania') { setTanzaniaFile(null); setTanzaniaPreview(null); }
    else if (field === 'more-experiences') { setMoreExperiencesFile(null); setMoreExperiencesPreview(null); }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const formData = new FormData();
      if (heroFile) formData.append('hero_image', heroFile);
      if (zanzibarFile) formData.append('zanzibar_image', zanzibarFile);
      if (tanzaniaFile) formData.append('tanzania_image', tanzaniaFile);
      if (moreExperiencesFile) formData.append('more_experiences_image', moreExperiencesFile);
      const res = await homeSettingsAPI.update(formData);
      setSettings(res.data);
      setHeroFile(null); setHeroPreview(null);
      setZanzibarFile(null); setZanzibarPreview(null);
      setTanzaniaFile(null); setTanzaniaPreview(null);
      setMoreExperiencesFile(null); setMoreExperiencesPreview(null);
      setMessage('Home page settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch { setMessage('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (field: string) => {
    if (!window.confirm(`Delete ${field} image?`)) return;
    setSaving(true);
    try {
      const formData = new FormData();
      const inputName = field === 'hero' ? 'hero' : field === 'zanzibar' ? 'zanzibar' : field === 'tanzania' ? 'tanzania' : 'more_experiences';
      formData.append(`clear_${inputName}`, 'true');
      const res = await homeSettingsAPI.update(formData);
      setSettings(res.data);
      clearField(field);
      setMessage('Image deleted');
      setTimeout(() => setMessage(''), 3000);
    } catch { setMessage('Failed to delete image'); }
    finally { setSaving(false); }
  };

  if (!isAuthenticated || !isAdmin) return null;
  if (loading) return <div className="page"><div className="loading">Loading editor...</div></div>;

  const previewUrl = (field: string) => {
    if (field === 'hero') return heroPreview || settings?.hero_image_url || null;
    if (field === 'zanzibar') return zanzibarPreview || settings?.zanzibar_image_url || null;
    if (field === 'tanzania') return tanzaniaPreview || settings?.tanzania_image_url || null;
    return moreExperiencesPreview || settings?.more_experiences_image_url || null;
  };

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1><Eye size={20} /> Home Editor</h1>
        <p>Manage homepage content and images</p>
      </div>

      {message && <div className="alert alert-success">{message}</div>}

      <div className="home-editor-grid">
        <div className="home-editor-card">
          <h3>Hero Background</h3>
          <div className="editor-preview">
            {previewUrl('hero') ? (
              <img src={previewUrl('hero')} alt="Hero" />
            ) : (
              <div className="editor-placeholder"><ImageIcon size={32} /><p>No hero image</p></div>
            )}
          </div>
          <div className="editor-actions">
            <label className="btn btn-sm btn-outline">
              <Upload size={14} /> Upload
              <input type="file" accept="image/*" hidden onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => handleFileChange(e, setHeroFile, setHeroPreview)} />
            </label>
            {(heroPreview || settings?.hero_image_url) && (
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete('hero')}>
                <Trash2 size={14} /> Delete
              </button>
            )}
            {heroFile && <button className="btn btn-sm btn-ghost" onClick={() => clearField('hero')}>Cancel</button>}
          </div>
        </div>

        <div className="home-editor-card">
          <h3>Zanzibar Card Image</h3>
          <div className="editor-preview">
            {previewUrl('zanzibar') ? (
              <img src={previewUrl('zanzibar')} alt="Zanzibar" />
            ) : (
              <div className="editor-placeholder"><ImageIcon size={32} /><p>No image</p></div>
            )}
          </div>
          <div className="editor-actions">
            <label className="btn btn-sm btn-outline">
              <Upload size={14} /> Upload
              <input type="file" accept="image/*" hidden onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => handleFileChange(e, setZanzibarFile, setZanzibarPreview)} />
            </label>
            {(zanzibarPreview || settings?.zanzibar_image_url) && (
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete('zanzibar')}>
                <Trash2 size={14} /> Delete
              </button>
            )}
            {zanzibarFile && <button className="btn btn-sm btn-ghost" onClick={() => clearField('zanzibar')}>Cancel</button>}
          </div>
        </div>

        <div className="home-editor-card">
          <h3>Tanzania Safaris Card Image</h3>
          <div className="editor-preview">
            {previewUrl('tanzania') ? (
              <img src={previewUrl('tanzania')} alt="Tanzania" />
            ) : (
              <div className="editor-placeholder"><ImageIcon size={32} /><p>No image</p></div>
            )}
          </div>
          <div className="editor-actions">
            <label className="btn btn-sm btn-outline">
              <Upload size={14} /> Upload
              <input type="file" accept="image/*" hidden onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => handleFileChange(e, setTanzaniaFile, setTanzaniaPreview)} />
            </label>
            {(tanzaniaPreview || settings?.tanzania_image_url) && (
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete('tanzania')}>
                <Trash2 size={14} /> Delete
              </button>
            )}
            {tanzaniaFile && <button className="btn btn-sm btn-ghost" onClick={() => clearField('tanzania')}>Cancel</button>}
          </div>
        </div>

        <div className="home-editor-card">
          <h3>More Experiences Empty State Image</h3>
          <p>Optional image shown in place of the pastel card illustration when no tours are published.</p>
          <div className="editor-preview">
            {previewUrl('more-experiences') ? (
              <img src={getImageUrl(previewUrl('more-experiences')) ?? undefined} alt="More experiences empty state preview" />
            ) : (
              <div className="editor-placeholder"><ImageIcon size={32} /><p>Using the pastel card illustration</p></div>
            )}
          </div>
          <div className="editor-actions">
            <label className="btn btn-sm btn-outline">
              <Upload size={14} /> {previewUrl('more-experiences') ? 'Replace image' : 'Upload image'}
              <input type="file" accept="image/*" hidden onChange={(e: ChangeEvent<HTMLInputElement>) => handleFileChange(e, setMoreExperiencesFile, setMoreExperiencesPreview)} />
            </label>
            {(moreExperiencesPreview || settings?.more_experiences_image_url) && (
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete('more-experiences')}>
                <Trash2 size={14} /> Remove image
              </button>
            )}
            {moreExperiencesFile && <button className="btn btn-sm btn-ghost" onClick={() => clearField('more-experiences')}>Cancel</button>}
          </div>
        </div>
      </div>

      <div className="home-editor-save">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || (!heroFile && !zanzibarFile && !tanzaniaFile && !moreExperiencesFile)}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}
