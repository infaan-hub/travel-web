"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import Image from "next/image";
import { tripsAPI } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { BookOpen, Plus, Pencil, Trash2 } from '@/components/icons';
import { getImageUrl } from '@/lib/utils/image-url';

import { useToast } from "@/components/ToastProvider";
import dashStyles from "@/features/pages/admin-dashboard.module.css";

import { isFile } from "@/features/pages/types";
import type {  TravelTip, Tour  } from "@/features/pages/types";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
export default function AdminTripsPage() {
  const toast = useToast();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState<TravelTip[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [form, setForm] = useState<{ title: string; content: string; category: string; image: File | null }>({ title: '', content: '', category: '', image: null });
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const loadTrips = useCallback(() => {
    setLoading(true);
    void (async () => {
      const pageSize = 100;
      const first = await tripsAPI.getAll({
        all: true,
        page: 1,
        page_size: pageSize,
      });
      const payload = first.data;
      if (Array.isArray(payload)) {
        setTrips(payload);
        return;
      }
      const rows = (payload.results ?? []) as TravelTip[];
      const pageCount = Math.ceil((payload.count ?? rows.length) / pageSize);
      const remaining = await Promise.all(
        Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
          tripsAPI.getAll({
            all: true,
            page: index + 2,
            page_size: pageSize,
          }),
        ),
      );
      setTrips([
        ...rows,
        ...remaining.flatMap((response) => response.data.results ?? []),
      ]);
    })()
      .catch(() => toast.error('Failed to load trips'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) { router.push('/login'); return; }
    const timer = window.setTimeout(loadTrips, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, isAuthenticated, isAdmin, loadTrips, router]);

  const resetForm = () => {
    setForm({ title: '', content: '', category: '', image: null });
    setImagePreview(null);
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (trip: any) => {
    setForm({ title: trip.title, content: trip.content, category: trip.category || '', image: null });
    setImagePreview(getImageUrl(trip.image_url) || null);
    setEditing(trip.id);
    setShowForm(true);
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      toast.error('Only .jpg and .png images are allowed');
      e.target.value = '';
      return;
    }
    if (file.size > 1048576) {
      toast.error('Image must be less than 1MB');
      e.target.value = '';
      return;
    }
    setForm({ ...form, image: file });
    const reader = new FileReader();
    reader.onload = (ev: ProgressEvent<FileReader>) => setImagePreview(String(ev.target?.result ?? ''));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: FormEvent<HTMLElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('content', form.content);
      if (form.category) formData.append('category', form.category);
      if (isFile(form.image)) formData.append('image', form.image);

      if (editing) {
        await tripsAPI.update(editing, formData);
      } else {
        await tripsAPI.create(formData);
      }
      resetForm();
      loadTrips();
    } catch {
      toast.error('Failed to save trip');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this trip?')) return;
    try {
      await tripsAPI.delete(id);
      setTrips(trips.filter(t => t.id !== id));
    } catch { toast.error('Failed to delete trip'); }
  };

  const tipCategories = Array.from(new Set(trips.map((t: TravelTip) => t.category).filter(Boolean))).sort();
  const filteredTrips = trips.filter((t: TravelTip) => {
    return categoryFilter === 'all' || t.category === categoryFilter;
  });

  if (!isAuthenticated || !isAdmin) return null;
  if (loading) return <div className={dashStyles.dashboardRoot}><div className="loading">Loading trips...</div></div>;

  return (
    <div className={dashStyles.dashboardRoot}>
      <header className={dashStyles.dashMasthead}>
        <div className={dashStyles.dashMastheadText}>
          <p className={dashStyles.dashEyebrow}>Admin workspace</p>
          <h1 className={dashStyles.dashTitle}>Trips</h1>
          <p className={dashStyles.dashLead}>Manage trips ({trips.length} trips)</p>
        </div>
        <div className={dashStyles.dashActions}>
          <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={16} /> Add Trip</button>
        </div>
      </header>

      <div className="admin-toolbar">
        <div className="search-input-group">
          <label className="sr-only" htmlFor="trip-category">Filter by category</label>
          <select
            id="trip-category"
            value={categoryFilter}
            onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            {tipCategories.map((category: string) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
      </div>

      {showForm && (
        <div className="admin-form-overlay">
          <div className="admin-form-card glass-card">
            <h2>{editing ? 'Edit Trip' : 'Add New Trip'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input type="text" required value={form.title} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({...form, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea rows={5} required value={form.content} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({...form, content: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input type="text" value={form.category} placeholder="e.g. Packing, Safety, Culture" onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({...form, category: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Image (.jpg or .png, max 1MB)</label>
                <input type="file" accept=".jpg,.jpeg,.png" onChange={handleImageChange} />
                {imagePreview && <img src={imagePreview} alt="Preview" className="image-preview" />}
              </div>
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (editing ? 'Update Trip' : 'Create Trip')}</button>
                <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <section className={dashStyles.dashPanel} aria-label="Trips">
        <div className={dashStyles.dashPanelHead}>
          <div className={dashStyles.dashPanelHeadMain}>
            <span className={dashStyles.dashPanelIcon} aria-hidden="true">
              <BookOpen size={17} />
            </span>
            <div>
              <h2 className={dashStyles.dashPanelTitle}>Trips</h2>
              <p className={dashStyles.dashPanelCopy}>Manage travel tips and trip content.</p>
            </div>
          </div>
        </div>
        <div className="admin-content">
          <div className="admin-bookings-table">
            <div className="table-responsive"><table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Title</th>
                <th>Category</th>
                <th>Content</th>
                <th>Image</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {trips.length === 0 ? (
                <tr><td colSpan={6} className="empty-cell">No trips yet</td></tr>
              ) : filteredTrips.map(t => (
                <tr key={t.id}>
                  <td>#{t.id}</td>
                  <td><strong>{t.title}</strong></td>
                  <td>{t.category || '-'}</td>
                  <td className="tip-cell">{t.content.substring(0, 100)}{t.content.length > 100 ? '...' : ''}</td>
                  <td>{t.image_url ? <Image src={getImageUrl(t.image_url)} alt={t.title} width={60} height={40} className="admin-thumb" /> : '-'}</td>
                  <td>
                    <div className="admin-actions">
                      <button className="btn btn-sm btn-outline" onClick={() => handleEdit(t)}><Pencil size={14} /></button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </div>
      </section>
    </div>
  );
}
