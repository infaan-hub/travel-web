// @ts-nocheck
"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { tripsAPI } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react';
import { getImageUrl } from '@/lib/utils/image-url';

import { useToast } from "@/components/ToastProvider";
export default function AdminTripsPage() {
  const toast = useToast();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', category: '', image: null });
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) { router.push('/admin/login'); return; }
    loadTrips();
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const loadTrips = () => {
    tripsAPI.getAll()
      .then(res => setTrips(res.data.results || res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const resetForm = () => {
    setForm({ title: '', content: '', category: '', image: null });
    setImagePreview(null);
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (trip) => {
    setForm({ title: trip.title, content: trip.content, category: trip.category || '', image: null });
    setImagePreview(getImageUrl(trip.image_url) || null);
    setEditing(trip.id);
    setShowForm(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
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
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('content', form.content);
      if (form.category) formData.append('category', form.category);
      if (form.image instanceof File) formData.append('image', form.image);

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

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this trip?')) return;
    try {
      await tripsAPI.delete(id);
      setTrips(trips.filter(t => t.id !== id));
    } catch { toast.error('Failed to delete trip'); }
  };

  if (!isAuthenticated || !isAdmin) return null;
  if (loading) return <div className="page"><div className="loading">Loading trips...</div></div>;

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1>Trips</h1>
        <p>Manage trips ({trips.length} trips)</p>
      </div>

      <div className="admin-toolbar">
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={16} /> Add Trip</button>
      </div>

      {showForm && (
        <div className="admin-form-overlay">
          <div className="admin-form-card">
            <h2>{editing ? 'Edit Trip' : 'Add New Trip'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Title</label>
                <input type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Content</label>
                <textarea rows="5" required value={form.content} onChange={e => setForm({...form, content: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Category</label>
                <input type="text" value={form.category} placeholder="e.g. Packing, Safety, Culture" onChange={e => setForm({...form, category: e.target.value})} />
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
                <tr><td colSpan="6" className="empty-cell">No trips yet</td></tr>
              ) : trips.map(t => (
                <tr key={t.id}>
                  <td>#{t.id}</td>
                  <td><strong>{t.title}</strong></td>
                  <td>{t.category || '-'}</td>
                  <td className="tip-cell">{t.content.substring(0, 100)}{t.content.length > 100 ? '...' : ''}</td>
                  <td>{t.image_url ? <img src={getImageUrl(t.image_url)} alt={t.title} className="admin-thumb" /> : '-'}</td>
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
    </div>
  );
}