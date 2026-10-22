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
  const [moreExperiencesFiles, setMoreExperiencesFiles] = useState<(File | null)[]>(Array(5).fill(null));
  const [moreExperiencesPreviews, setMoreExperiencesPreviews] = useState<(string | null)[]>(Array(5).fill(null));
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
    else if (field.startsWith('more-experiences-')) {
      const index = Number(field.slice('more-experiences-'.length)) - 1;
      setMoreExperiencesFiles((files) => files.map((file, i) => i === index ? null : file));
      setMoreExperiencesPreviews((previews) => previews.map((preview, i) => i === index ? null : preview));
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      let updatedSettings = settings;
      if (heroFile || zanzibarFile || tanzaniaFile) {
        const formData = new FormData();
        if (heroFile) formData.append('hero_image', heroFile);
        if (zanzibarFile) formData.append('zanzibar_image', zanzibarFile);
        if (tanzaniaFile) formData.append('tanzania_image', tanzaniaFile);
        const res = await homeSettingsAPI.update(formData);
        updatedSettings = res.data;
      }
      for (const [index, file] of moreExperiencesFiles.entries()) {
        if (!file) continue;
        const formData = new FormData();
        formData.append(`more_experiences_image_${index + 1}`, file);
        const res = await homeSettingsAPI.update(formData);
        updatedSettings = res.data;
      }
      if (updatedSettings) setSettings(updatedSettings);
      setHeroFile(null); setHeroPreview(null);
      setZanzibarFile(null); setZanzibarPreview(null);
      setTanzaniaFile(null); setTanzaniaPreview(null);
      setMoreExperiencesFiles(Array(5).fill(null)); setMoreExperiencesPreviews(Array(5).fill(null));
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
      const portfolioIndex = field.startsWith('more-experiences-') ? Number(field.slice('more-experiences-'.length)) : null;
      const inputName = field === 'hero' ? 'hero' : field === 'zanzibar' ? 'zanzibar' : field === 'tanzania' ? 'tanzania' : `more_experiences_image_${portfolioIndex}`;
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
    return settings?.more_experiences_image_url || null;
  };

  const portfolioPreview = (index: number) => moreExperiencesPreviews[index] || settings?.more_experiences_image_urls?.[index] || null;

  const choosePortfolioImage = (index: number, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setMoreExperiencesFiles((files) => files.map((value, i) => i === index ? file : value));
    const reader = new FileReader();
    reader.onload = (result) => setMoreExperiencesPreviews((previews) => previews.map((value, i) => i === index ? String(result.target?.result ?? '') : value));
    reader.readAsDataURL(file);
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

        <div className="home-editor-card home-editor-portfolio">
          <h3>More Experiences Empty State Images</h3>
          <p>Choose, replace or remove each of the five images around the Travel. card.</p>
          <div className="home-editor-portfolio-grid">
            {Array.from({ length: 5 }, (_, index) => (
              <div className="home-editor-portfolio-item" key={index}>
                <div className="home-editor-portfolio-preview">
                  {portfolioPreview(index) ? (
                    <img src={getImageUrl(portfolioPreview(index))} alt={`Travel. empty state card ${index + 1}`} />
                  ) : (
                    <div className="editor-placeholder"><ImageIcon size={24} /><span>Pastel card {index + 1}</span></div>
                  )}
                </div>
                <div className="editor-actions">
                  <label className="btn btn-sm btn-outline">
                    <Upload size={14} /> {portfolioPreview(index) ? 'Replace' : 'Upload'}
                    <input type="file" accept="image/*" hidden onChange={(event: ChangeEvent<HTMLInputElement>) => choosePortfolioImage(index, event)} />
                  </label>
                  {portfolioPreview(index) && (
                    <button className="btn btn-sm btn-danger" onClick={() => handleDelete(`more-experiences-${index + 1}`)}>
                      <Trash2 size={14} /> Remove
                    </button>
                  )}
                  {moreExperiencesFiles[index] && (
                    <button className="btn btn-sm btn-ghost" onClick={() => clearField(`more-experiences-${index + 1}`)}>Cancel</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="home-editor-save">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || (!heroFile && !zanzibarFile && !tanzaniaFile && !moreExperiencesFiles.some(Boolean))}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}
