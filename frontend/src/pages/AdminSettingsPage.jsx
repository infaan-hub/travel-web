import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI, profileAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Settings, Save, User, Mail, Camera, Trash2 } from 'lucide-react';

export default function AdminSettingsPage() {
  const { isAuthenticated, isAdmin, user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ username: user?.username || '', email: user?.email || '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [profileImageUrl, setProfileImageUrl] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      profileAPI.get().then(res => {
        if (res.data.profile_image) setProfileImageUrl(res.data.profile_image);
      }).catch(() => {});
    }
  }, [isAuthenticated]);

  if (!isAuthenticated || !isAdmin) { navigate('/admin/login'); return null; }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      await authAPI.updateUser(form);
      setMessage('Settings saved successfully');
    } catch {
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
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
    <div className="page admin-page">
      <div className="page-header">
        <h1>Settings</h1>
        <p>Manage your account settings</p>
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
            <label><User size={14} /> Username</label>
            <input type="text" value={form.username} onChange={e => setForm({...form, username: e.target.value})} />
          </div>
          <div className="form-group">
            <label><Mail size={14} /> Email</label>
            <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary" disabled={saving}><Save size={16} /> {saving ? 'Saving...' : 'Save Settings'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
