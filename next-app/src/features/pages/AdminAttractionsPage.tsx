"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback } from 'react';
import Image from "next/image";
import { attractionsAPI } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { Map, Plus, Pencil, Trash2, X } from '@/components/icons';
import { getImageUrl } from '@/lib/utils/image-url';

import { useToast } from "@/components/ToastProvider";

import { isFile } from "@/features/pages/types";
import type {  Attraction  } from "@/features/pages/types";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
export default function AdminAttractionsPage() {
  const toast = useToast();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<{ name: string; location: string; image: File | null }>({ name: '', location: '', image: null });
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const loadAttractions = useCallback(() => {
    setLoading(true);
    void (async () => {
      const pageSize = 100;
      const first = await attractionsAPI.getAll({ page: 1, page_size: pageSize });
      const payload = first.data;
      if (Array.isArray(payload)) {
        setAttractions(payload as Attraction[]);
        return;
      }
      const rows = (payload.results ?? []) as Attraction[];
      const pageCount = Math.ceil((payload.count ?? rows.length) / pageSize);
      const remaining = await Promise.all(
        Array.from({ length: Math.max(0, pageCount - 1) }, (_, index) =>
          attractionsAPI.getAll({ page: index + 2, page_size: pageSize }),
        ),
      );
      setAttractions([
        ...rows,
        ...remaining.flatMap((response) => response.data.results ?? []),
      ]);
    })()
      .catch(() => toast.error('Failed to load attractions'))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) { router.push('/admin/login'); return; }
    const timer = window.setTimeout(loadAttractions, 0);
    return () => window.clearTimeout(timer);
  }, [authLoading, isAuthenticated, isAdmin, router, loadAttractions]);

  const resetForm = () => {
    setForm({ name: '', location: '', image: null });
    setImagePreview(null);
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (att: Attraction) => {
    setForm({ name: att.name, location: att.location, image: null });
    setImagePreview(getImageUrl(att.image_url) || null);
    setEditing(att.id);
    setShowForm(true);
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const file = (e.currentTarget as HTMLInputElement).files?.[0];
    if (file) {
      setForm({ ...form, image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLElement>) => {
    e.preventDefault();
    if (!form.name.trim() || !form.location.trim()) { toast.error('Name and location are required'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('location', form.location.trim());
      if (isFile(form.image)) fd.append('image', form.image);
      if (editing) {
        const res = await attractionsAPI.update(editing, fd);
        setAttractions(attractions.map(a => a.id === editing ? res.data : a));
      } else {
        const res = await attractionsAPI.create(fd);
        setAttractions([...attractions, res.data]);
      }
      resetForm();
    } catch { toast.error('Failed to save attraction'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this attraction permanently?')) return;
    try {
      await attractionsAPI.delete(id);
      setAttractions(attractions.filter(a => a.id !== id));
    } catch { toast.error('Failed to delete attraction'); }
  };

  const categories = Array.from(
    new Set(attractions.map((a: any) => a.category).filter(Boolean)),
  ).sort();
  const filtered = attractions.filter(a => {
    const matchesCategory = categoryFilter === 'all' || a.category === categoryFilter;
    return matchesCategory;
  });

  if (!isAuthenticated || !isAdmin) return null;
  if (loading) return <div className="page"><div className="loading">Loading attractions...</div></div>;

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1><Map size={20} /> Attractions Management</h1>
        <p>{attractions.length} attractions</p>
      </div>

      <div className="admin-toolbar">
        <div className="search-input-group">
          <label className="sr-only" htmlFor="attraction-category">Filter by category</label>
          <select
            id="attraction-category"
            value={categoryFilter}
            onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setCategoryFilter(e.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((category: string) => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={16} /> Add Attraction
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={(e: MouseEvent<HTMLElement>) => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editing ? 'Edit Attraction' : 'Add Attraction'}</h3>
              <button className="modal-close" onClick={resetForm}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-group">
                <label>Name</label>
                <input type="text" placeholder="Attraction name" value={form.name} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input type="text" placeholder="e.g. Zanzibar, Serengeti" value={form.location} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setForm({ ...form, location: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Image</label>
                <input type="file" accept="image/*" onChange={handleImageChange} className="file-input" />
                {imagePreview && <img src={imagePreview} alt="Preview" className="image-preview" />}
              </div>
              <div className="form-actions">
                <button type="button" className="btn btn-outline" onClick={resetForm}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="admin-content">
        {filtered.length === 0 ? (
          <div className="empty-state"><p>No attractions found</p></div>
        ) : (
          <div className="admin-attractions-table">
            <div className="table-responsive"><table>
              <thead>
                <tr>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Location</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(att => (
                  <tr key={att.id}>
                    <td>
                      <Image src={getImageUrl(att.image_url) || '/placeholder.jpg'} alt={att.name} width={320} height={200}
                        className="admin-attraction-image" />
                    </td>
                    <td><strong>{att.name}</strong></td>
                    <td>{att.location}</td>
                    <td>
                      <div className="admin-actions">
                        <button className="btn btn-sm btn-outline" title="Edit" onClick={() => handleEdit(att)}>
                          <Pencil size={14} />
                        </button>
                        <button className="btn btn-sm btn-danger" title="Delete" onClick={() => handleDelete(att.id)}>
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}
      </div>
    </div>
  );
}