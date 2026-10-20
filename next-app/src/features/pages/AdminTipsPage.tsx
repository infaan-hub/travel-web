// @ts-nocheck
"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { tripsAPI } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { BookOpen, Plus, Pencil, Trash2 } from 'lucide-react';

import { useToast } from "@/components/ToastProvider";
export default function AdminTipsPage() {
  const toast = useToast();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', category: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) { router.push('/admin/login'); return; }
    loadTips();
  }, [authLoading, isAuthenticated, isAdmin, router]);

  const loadTips = () => {
    tripsAPI.getAll()
      .then(res => setTips(res.data.results || res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const resetForm = () => {
    setForm({ title: '', content: '', category: '' });
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (tip) => {
    setForm({ title: tip.title, content: tip.content, category: tip.category || '' });
    setEditing(tip.id);
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editing) {
        await tripsAPI.update(editing, form);
      } else {
        await tripsAPI.create(form);
      }
      resetForm();
      loadTips();
    } catch {
      toast.error('Failed to save tip');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this tip?')) return;
    try {
      await tripsAPI.delete(id);
      setTips(tips.filter(t => t.id !== id));
    } catch { toast.error('Failed to delete tip'); }
  };

  if (!isAuthenticated || !isAdmin) return null;
  if (loading) return <div className="page"><div className="loading">Loading tips...</div></div>;

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1>Travel Tips</h1>
        <p>Manage travel tips and advice ({tips.length} tips)</p>
      </div>

      <div className="admin-toolbar">
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={16} /> Add Tip</button>
      </div>

      {showForm && (
        <div className="admin-form-overlay">
          <div className="admin-form-card">
            <h2>{editing ? 'Edit Tip' : 'Add New Tip'}</h2>
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
              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (editing ? 'Update Tip' : 'Create Tip')}</button>
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tips.length === 0 ? (
                <tr><td colSpan="5" className="empty-cell">No tips yet</td></tr>
              ) : tips.map(t => (
                <tr key={t.id}>
                  <td>#{t.id}</td>
                  <td><strong>{t.title}</strong></td>
                  <td>{t.category || '-'}</td>
                  <td className="tip-cell">{t.content.substring(0, 100)}{t.content.length > 100 ? '...' : ''}</td>
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
