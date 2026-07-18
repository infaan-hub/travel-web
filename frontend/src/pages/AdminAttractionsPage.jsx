import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { attractionsAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Map, Plus, Pencil, Trash2, Search, X } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

export default function AdminAttractionsPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [attractions, setAttractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', location: '', image: null });
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) { navigate('/admin/login'); return; }
    loadAttractions();
  }, [isAuthenticated, isAdmin, navigate]);

  const loadAttractions = () => {
    attractionsAPI.getAll()
      .then(res => setAttractions(res.data.results || res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const resetForm = () => {
    setForm({ name: '', location: '', image: null });
    setImagePreview(null);
    setEditing(null);
    setShowForm(false);
  };

  const handleEdit = (att) => {
    setForm({ name: att.name, location: att.location, image: null });
    setImagePreview(getImageUrl(att.image_url) || null);
    setEditing(att.id);
    setShowForm(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setForm({ ...form, image: file });
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.location.trim()) { alert('Name and location are required'); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('name', form.name.trim());
      fd.append('location', form.location.trim());
      if (form.image instanceof File) fd.append('image', form.image);
      if (editing) {
        const res = await attractionsAPI.update(editing, fd);
        setAttractions(attractions.map(a => a.id === editing ? res.data : a));
      } else {
        const res = await attractionsAPI.create(fd);
        setAttractions([...attractions, res.data]);
      }
      resetForm();
    } catch { alert('Failed to save attraction'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this attraction permanently?')) return;
    try {
      await attractionsAPI.delete(id);
      setAttractions(attractions.filter(a => a.id !== id));
    } catch { alert('Failed to delete attraction'); }
  };

  const filtered = attractions.filter(a =>
    search ? a.name?.toLowerCase().includes(search.toLowerCase()) || a.location?.toLowerCase().includes(search.toLowerCase()) : true
  );

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
          <Search size={16} />
          <input type="text" placeholder="Search attractions..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}>
          <Plus size={16} /> Add Attraction
        </button>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) resetForm(); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editing ? 'Edit Attraction' : 'Add Attraction'}</h3>
              <button className="modal-close" onClick={resetForm}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="form-group">
                <label>Name</label>
                <input type="text" placeholder="Attraction name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input type="text" placeholder="e.g. Zanzibar, Serengeti" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} required />
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
            <table>
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
                      <img src={getImageUrl(att.image_url) || '/placeholder.jpg'} alt={att.name}
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
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
