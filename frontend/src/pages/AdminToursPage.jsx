import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toursAPI, geocodeAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Globe, Plus, Pencil, Trash2, Search, X, MapPin, Loader, Star, GripVertical, Check, CheckSquare, Square } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

const PREDEFINED_INCLUDES = [
  'Hotel Pickup & Drop-off', 'Airport Transfer (if available)', 'Private Transportation',
  'Professional Tour Guide', 'Safari Driver Guide', 'Entrance Fees to Attractions',
  'Park Entry Fees', 'Wildlife Conservation Fees', 'Boat Transportation',
  'Ferry Tickets (where applicable)', 'Lunch Meal', 'Breakfast Meal', 'Dinner Meal',
  'Drinking Water', 'Soft Drinks', 'Snorkeling Equipment', 'Safety Equipment',
  'Photography Assistance', 'Cultural Experience Activities',
  'Free Wi-Fi During Transport (where available)',
];

const PREDEFINED_EXCLUDES = [
  'Personal Expenses', 'Tips for Guides and Drivers', 'Travel Insurance',
  'International Flights', 'Domestic Flights (unless specified)', 'Visa Fees',
  'Passport Fees', 'Extra Activities Not Listed', 'Personal Shopping',
  'Souvenirs', 'Alcoholic Drinks', 'Extra Meals Not Mentioned',
  'Laundry Services', 'Medical Expenses', 'Private Requests Outside the Package',
  'Accommodation Upgrade Costs', 'Additional Transportation Outside the Tour',
  'Camera Fees at Some Attractions', 'Extra Luggage Charges',
  'Any Service Not Mentioned in "What\'s Included"',
];

function useDebounce(fn, delay) {
  const timer = useRef(null);
  return useCallback((...args) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => fn(...args), delay);
  }, [fn, delay]);
}

export default function AdminToursPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', short_description: '',
    price: '', duration: '', location: '', category: 'zanzibar',
    image: null,
  });
  const [includedItems, setIncludedItems] = useState([]);
  const [excludedItems, setExcludedItems] = useState([]);
  const [customInclude, setCustomInclude] = useState('');
  const [customExclude, setCustomExclude] = useState('');
  const [coords, setCoords] = useState({ lat: '', lng: '' });
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState('');

  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) { navigate('/admin/login'); return; }
    loadTours();
  }, [isAuthenticated, isAdmin, navigate]);

  const loadTours = () => {
    toursAPI.getAll()
      .then(res => setTours(res.data.results || res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  const resetForm = () => {
    setForm({ title: '', description: '', short_description: '', price: '', duration: '', location: '', category: 'zanzibar', image: null });
    setIncludedItems([]);
    setExcludedItems([]);
    setCustomInclude('');
    setCustomExclude('');
    setCoords({ lat: '', lng: '' });
    setImagePreview(null);
    setEditing(null);
    setShowForm(false);
    setGalleryImages([]);
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setGeoError('');
  };

  const handleEdit = async (tour) => {
    const parseItems = (v) => {
      if (Array.isArray(v)) return v;
      if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p : []; } catch { return []; } }
      return [];
    };
    setForm({
      title: tour.title, description: tour.description, short_description: tour.short_description || '',
      price: tour.price, duration: tour.duration,
      location: tour.destination || '', category: tour.category,
      image: null,
    });
    setIncludedItems(parseItems(tour.included_items || tour.includes));
    setExcludedItems(parseItems(tour.excluded_items || tour.excludes));
    setCoords({ lat: tour.destination_lat || '', lng: tour.destination_lng || '' });
    setImagePreview(getImageUrl(tour.image_url) || null);
    setEditing(tour.id);
    setShowForm(true);
    try {
      const res = await toursAPI.getGallery(tour.id);
      setGalleryImages(res.data.gallery_images || res.data.results || res.data);
    } catch { setGalleryImages([]); }
  };

  const doGeocode = async (location) => {
    if (!location || location.length < 3) return;
    setGeocoding(true);
    setGeoError('');
    try {
      const res = await geocodeAPI.search(location);
      if (res.data.lat && res.data.lng) {
        setCoords({ lat: res.data.lat, lng: res.data.lng });
      }
    } catch {
      setGeoError('Could not auto-detect coordinates. Enter manually.');
    } finally {
      setGeocoding(false);
    }
  };

  const debouncedGeo = useDebounce(doGeocode, 800);

  const handleLocationChange = (e) => {
    const val = e.target.value;
    setForm(f => ({ ...f, location: val }));
    if (val.length >= 3) debouncedGeo(val);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm({ ...form, image: file });
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleGalleryAdd = (e) => {
    const files = Array.from(e.target.files);
    const pending = files.map(file => new Promise(resolve => {
      const reader = new FileReader();
      reader.onload = (ev) => resolve(ev.target.result);
      reader.readAsDataURL(file);
    }));
    Promise.all(pending).then(previews => {
      setGalleryFiles(prev => [...prev, ...files]);
      setGalleryPreviews(prev => [...prev, ...previews]);
    });
    e.target.value = '';
  };

  const removeGalleryFile = (index) => {
    setGalleryFiles(prev => prev.filter((_, i) => i !== index));
    setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const removeGalleryImage = async (imageId) => {
    if (!window.confirm('Delete this image?')) return;
    try {
      await toursAPI.deleteGalleryImage(editing, imageId);
      setGalleryImages(prev => prev.filter(img => img.id !== imageId));
    } catch { alert('Failed to delete'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      if (form.short_description) formData.append('short_description', form.short_description);
      formData.append('price', form.price);
      formData.append('duration', form.duration);
      formData.append('category', form.category);
      if (form.location) formData.append('destination', form.location);
      if (coords.lat) formData.append('destination_lat', coords.lat);
      if (coords.lng) formData.append('destination_lng', coords.lng);
      if (includedItems.length) formData.append('includes', JSON.stringify(includedItems));
      if (excludedItems.length) formData.append('excludes', JSON.stringify(excludedItems));
      if (form.image instanceof File) formData.append('image', form.image);

      let tourId;
      if (editing) {
        await toursAPI.update(editing, formData);
        tourId = editing;
      } else {
        const res = await toursAPI.create(formData);
        tourId = res.data.id;
      }

      for (const file of galleryFiles) {
        const gf = new FormData();
        gf.append('image', file);
        await toursAPI.addGalleryImage(tourId, gf);
      }

      resetForm();
      loadTours();
    } catch (err) {
      alert('Failed to save tour');
    } finally {
      setSaving(false);
    }
  };

  const toggleInclude = (item) => {
    setIncludedItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const toggleExclude = (item) => {
    setExcludedItems(prev => prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]);
  };

  const addCustomInclude = () => {
    const item = customInclude.trim();
    if (!item || includedItems.includes(item)) return;
    setIncludedItems(prev => [...prev, item]);
    setCustomInclude('');
  };

  const addCustomExclude = () => {
    const item = customExclude.trim();
    if (!item || excludedItems.includes(item)) return;
    setExcludedItems(prev => [...prev, item]);
    setCustomExclude('');
  };

  const removeInclude = (item) => setIncludedItems(prev => prev.filter(i => i !== item));
  const removeExclude = (item) => setExcludedItems(prev => prev.filter(i => i !== item));

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this tour?')) return;
    try {
      await toursAPI.delete(id);
      setTours(tours.filter(t => t.id !== id));
    } catch { alert('Failed to delete tour'); }
  };

  if (!isAuthenticated || !isAdmin) return null;
  if (loading) return <div className="page"><div className="loading">Loading tours...</div></div>;

  const filtered = tours.filter(t => t.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1>Manage Tours</h1>
        <p>{tours.length} tours total</p>
      </div>

      <div className="admin-toolbar">
        <div className="search-input-group">
          <Search size={16} />
          <input type="text" placeholder="Search tours..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <button className="btn btn-primary" onClick={() => { resetForm(); setShowForm(true); }}><Plus size={16} /> Add Tour</button>
      </div>

      {showForm && (
        <div className="admin-form-overlay">
          <div className="admin-form-card admin-form-wide">
            <h2>{editing ? 'Edit Tour' : 'Add New Tour'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Title</label>
                  <input type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                    <option value="zanzibar">Zanzibar</option>
                    <option value="tanzania">Infaan</option>
                    <option value="international">International</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea rows="4" required value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Short Description</label>
                <input type="text" value={form.short_description} onChange={e => setForm({...form, short_description: e.target.value})} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Price ($)</label>
                  <input type="number" step="0.01" required value={form.price} onChange={e => setForm({...form, price: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Duration</label>
                  <input type="text" required value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} />
                </div>
              </div>

              <div className="form-group location-group">
                <label>Location / Destination</label>
                <div className="location-input-row">
                  <input type="text" required value={form.location} onChange={handleLocationChange} placeholder="e.g. Stone Town, Zanzibar" />
                  {geocoding && <Loader size={18} className="spin geo-spinner" />}
                  {coords.lat && <MapPin size={18} className="geo-confirmed" />}
                </div>
                {coords.lat && (
                  <div className="coords-display">
                    <span>Lat: <strong>{coords.lat}</strong></span>
                    <span>Lng: <strong>{coords.lng}</strong></span>
                    <span className="coords-note">Automatically detected from location</span>
                  </div>
                )}
                {geoError && <p className="field-error">{geoError}</p>}
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Latitude (auto-filled, editable)</label>
                  <input type="number" step="any" value={coords.lat} onChange={e => setCoords(c => ({ ...c, lat: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Longitude (auto-filled, editable)</label>
                  <input type="number" step="any" value={coords.lng} onChange={e => setCoords(c => ({ ...c, lng: e.target.value }))} />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>What's Included</label>
                  <div className="items-checklist">
                    {PREDEFINED_INCLUDES.map(item => (
                      <label key={item} className={`check-item ${includedItems.includes(item) ? 'checked' : ''}`}
                        onClick={() => toggleInclude(item)}>
                        {includedItems.includes(item) ? <CheckSquare size={16} /> : <Square size={16} />}
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                  <div className="custom-item-row">
                    <input type="text" placeholder="Add custom item..." value={customInclude}
                      onChange={e => setCustomInclude(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addCustomInclude(); }} />
                    <button type="button" className="btn btn-sm btn-outline" onClick={addCustomInclude}>
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  {includedItems.filter(i => !PREDEFINED_INCLUDES.includes(i)).length > 0 && (
                    <div className="selected-custom-items">
                      {includedItems.filter(i => !PREDEFINED_INCLUDES.includes(i)).map(item => (
                        <span key={item} className="custom-tag">
                          {item}
                          <button type="button" onClick={() => removeInclude(item)}><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>What's Excluded</label>
                  <div className="items-checklist">
                    {PREDEFINED_EXCLUDES.map(item => (
                      <label key={item} className={`check-item ${excludedItems.includes(item) ? 'checked' : ''}`}
                        onClick={() => toggleExclude(item)}>
                        {excludedItems.includes(item) ? <CheckSquare size={16} /> : <Square size={16} />}
                        <span>{item}</span>
                      </label>
                    ))}
                  </div>
                  <div className="custom-item-row">
                    <input type="text" placeholder="Add custom item..." value={customExclude}
                      onChange={e => setCustomExclude(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') addCustomExclude(); }} />
                    <button type="button" className="btn btn-sm btn-outline" onClick={addCustomExclude}>
                      <Plus size={14} /> Add
                    </button>
                  </div>
                  {excludedItems.filter(i => !PREDEFINED_EXCLUDES.includes(i)).length > 0 && (
                    <div className="selected-custom-items">
                      {excludedItems.filter(i => !PREDEFINED_EXCLUDES.includes(i)).map(item => (
                        <span key={item} className="custom-tag">
                          {item}
                          <button type="button" onClick={() => removeExclude(item)}><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="form-group">
                <label>Main Image (Cover)</label>
                <input type="file" accept=".jpg,.jpeg,.png" onChange={handleImageChange} />
                {imagePreview && <img src={imagePreview} alt="Preview" className="image-preview" />}
              </div>

              <div className="form-group">
                <label>Gallery Images (add as many as needed)</label>
                <div className="gallery-upload-grid">
                  {galleryImages.map(img => (
                    <div key={img.id} className="gallery-thumb-item">
                      <img src={getImageUrl(img.image_url)} alt="" />
                      <button type="button" className="gallery-remove-btn" onClick={() => removeGalleryImage(img.id)}><X size={12} /></button>
                    </div>
                  ))}
                  {galleryPreviews.map((preview, i) => (
                    <div key={`new-${i}`} className="gallery-thumb-item">
                      <img src={preview} alt="" />
                      <button type="button" className="gallery-remove-btn" onClick={() => removeGalleryFile(i)}><X size={12} /></button>
                    </div>
                  ))}
                  <label className="gallery-add-btn">
                    <Plus size={24} />
                    <input type="file" accept="image/*" multiple hidden onChange={handleGalleryAdd} />
                  </label>
                </div>
              </div>

              <div className="form-actions">
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : (editing ? 'Update Tour' : 'Create Tour')}</button>
                <button type="button" className="btn btn-ghost" onClick={resetForm}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="admin-content">
        <div className="admin-bookings-table">
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Image</th>
                <th>Title</th>
                <th>Category</th>
                <th>Price</th>
                <th>Duration</th>
                <th>Location</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="8" className="empty-cell">No tours found</td></tr>
              ) : filtered.map(t => (
                <tr key={t.id}>
                  <td>#{t.id}</td>
                  <td>{t.image_url ? <img src={getImageUrl(t.image_url)} alt="" className="admin-thumb" /> : '-'}</td>
                  <td><strong>{t.title}</strong></td>
                  <td><span className={`tour-cat-badge ${t.category}`}>{t.category}</span></td>
                  <td>${t.price}</td>
                  <td>{t.duration}</td>
                  <td>{t.destination || '-'}</td>
                  <td>
                    <div className="admin-actions">
                      <button className="btn btn-sm btn-outline" onClick={() => handleEdit(t)}><Pencil size={14} /></button>
                      <button className="btn btn-sm btn-danger" onClick={() => handleDelete(t.id)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
