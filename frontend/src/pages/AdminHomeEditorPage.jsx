import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { homeSettingsAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Save, Upload, Trash2, Eye, Image as ImageIcon } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

export default function AdminHomeEditorPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [heroFile, setHeroFile] = useState(null);
  const [heroPreview, setHeroPreview] = useState(null);
  const [zanzibarFile, setZanzibarFile] = useState(null);
  const [zanzibarPreview, setZanzibarPreview] = useState(null);
  const [tanzaniaFile, setTanzaniaFile] = useState(null);
  const [tanzaniaPreview, setTanzaniaPreview] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) { navigate('/admin/login'); return; }
    loadSettings();
  }, [isAuthenticated, isAdmin, navigate]);

  const loadSettings = async () => {
    try {
      const res = await homeSettingsAPI.get();
      setSettings(res.data);
    } catch { console.error('Failed to load home settings'); }
    finally { setLoading(false); }
  };

  const handleFileChange = (e, setFile, setPreview) => {
    const file = e.target.files[0];
    if (!file) return;
    setFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const clearField = (field) => {
    if (field === 'hero') { setHeroFile(null); setHeroPreview(null); }
    else if (field === 'zanzibar') { setZanzibarFile(null); setZanzibarPreview(null); }
    else if (field === 'tanzania') { setTanzaniaFile(null); setTanzaniaPreview(null); }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      const formData = new FormData();
      if (heroFile) formData.append('hero_image', heroFile);
      if (zanzibarFile) formData.append('zanzibar_image', zanzibarFile);
      if (tanzaniaFile) formData.append('tanzania_image', tanzaniaFile);
      const res = await homeSettingsAPI.update(formData);
      setSettings(res.data);
      setHeroFile(null); setHeroPreview(null);
      setZanzibarFile(null); setZanzibarPreview(null);
      setTanzaniaFile(null); setTanzaniaPreview(null);
      setMessage('Home page settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch { setMessage('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (field) => {
    if (!window.confirm(`Delete ${field} image?`)) return;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('clear_' + (field === 'hero' ? 'hero' : field === 'zanzibar' ? 'zanzibar' : 'tanzania'), 'true');
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

  const previewUrl = (field) => {
    if (field === 'hero') return heroPreview || settings?.hero_image_url || null;
    if (field === 'zanzibar') return zanzibarPreview || settings?.zanzibar_image_url || null;
    return tanzaniaPreview || settings?.tanzania_image_url || null;
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
              <input type="file" accept="image/*" hidden onChange={(e) => handleFileChange(e, setHeroFile, setHeroPreview)} />
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
              <input type="file" accept="image/*" hidden onChange={(e) => handleFileChange(e, setZanzibarFile, setZanzibarPreview)} />
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
              <input type="file" accept="image/*" hidden onChange={(e) => handleFileChange(e, setTanzaniaFile, setTanzaniaPreview)} />
            </label>
            {(tanzaniaPreview || settings?.tanzania_image_url) && (
              <button className="btn btn-sm btn-danger" onClick={() => handleDelete('tanzania')}>
                <Trash2 size={14} /> Delete
              </button>
            )}
            {tanzaniaFile && <button className="btn btn-sm btn-ghost" onClick={() => clearField('tanzania')}>Cancel</button>}
          </div>
        </div>
      </div>

      <div className="home-editor-save">
        <button className="btn btn-primary" onClick={handleSave} disabled={saving || (!heroFile && !zanzibarFile && !tanzaniaFile)}>
          <Save size={16} /> {saving ? 'Saving...' : 'Save All Changes'}
        </button>
      </div>
    </div>
  );
}
