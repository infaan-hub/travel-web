// @ts-nocheck
"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect, useCallback, useRef } from 'react';
import Image from "next/image";
import { toursAPI, geocodeAPI } from '@/lib/api/client';
import { useAuth } from '@/context/AuthContext';
import { Globe, Plus, Pencil, Trash2, Search, X, MapPin, Loader, Star, GripVertical, Check, CheckSquare, Square } from 'lucide-react';
import { getImageUrl } from '@/lib/utils/image-url';

import { useToast } from "@/components/ToastProvider";
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
  const toast = useToast();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [ordering, setOrdering] = useState('-created_at');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(15);
  const [total, setTotal] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    title: '', description: '', short_description: '',
    price: '', duration: '', location: '', category: 'zanzibar',
    image: null, image2: null, image3: null,
  });
  const [includedItems, setIncludedItems] = useState([]);
  const [excludedItems, setExcludedItems] = useState([]);
  const [customInclude, setCustomInclude] = useState('');
  const [customExclude, setCustomExclude] = useState('');
  const [coords, setCoords] = useState({ lat: '', lng: '' });
  const [imagePreview, setImagePreview] = useState(null);
  const [image2Preview, setImage2Preview] = useState(null);
  const [image3Preview, setImage3Preview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [geoError, setGeoError] = useState('');

  const [galleryImages, setGalleryImages] = useState([]);
  const [galleryFiles, setGalleryFiles] = useState([]);
  const [galleryPreviews, setGalleryPreviews] = useState([]);
  const [translationForm, setTranslationForm] = useState({ locale: 'sw', title: '', description: '', short_description: '' });
  const [translations, setTranslations] = useState([]);
  const [draggingGalleryId, setDraggingGalleryId] = useState(null);
  const [galleryDropTargetId, setGalleryDropTargetId] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) { router.push('/admin/login'); return; }
    loadTours();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, isAdmin, router, ordering, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      loadTours();
    }, 350);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const loadTours = () => {
    toursAPI
      .getAll({ search: search || undefined, ordering, page, page_size: pageSize })
      .then((res) => {
        setTours(res.data.results || res.data);
        setTotal(res.data.count ?? (res.data.results || res.data).length);
      })
      .catch((error) => toast.error(error.response?.data?.message || 'Failed to load tours'))
      .finally(() => setLoading(false));
  };

  const resetForm = () => {
    setForm({ title: '', description: '', short_description: '', price: '', duration: '', location: '', category: 'zanzibar', image: null, image2: null, image3: null });
    setIncludedItems([]);
    setExcludedItems([]);
    setCustomInclude('');
    setCustomExclude('');
    setCoords({ lat: '', lng: '' });
    setImagePreview(null);
    setImage2Preview(null);
    setImage3Preview(null);
    setEditing(null);
    setShowForm(false);
    setGalleryImages([]);
    setGalleryFiles([]);
    setGalleryPreviews([]);
    setGeoError('');
  };

  const loadTranslations = async (tourId) => {
    try {
      const res = await api.get(`/tours/${tourId}/translations/`);
      setTranslations(res.data?.translations || []);
    } catch {
      setTranslations([]);
    }
  };

  const saveTranslation = async () => {
    try {
      await api.put(`/tours/${editing}/translations/`, translationForm);
      toast.success('Translation saved');
      setTranslationForm({ locale: 'sw', title: '', description: '', short_description: '' });
      loadTranslations(editing);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save the translation');
    }
  };

  const loadGallery = async (tourId) => {
    try {
      const res = await toursAPI.getGallery(tourId);
      setGalleryImages(res.data.gallery_images || res.data.results || res.data);
    } catch {
      setGalleryImages([]);
    }
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
      image: null, image2: null, image3: null,
    });
    setIncludedItems(parseItems(tour.included_items || tour.includes));
    setExcludedItems(parseItems(tour.excluded_items || tour.excludes));
    setCoords({ lat: tour.destination_lat || '', lng: tour.destination_lng || '' });
    setImagePreview(getImageUrl(tour.image_url) || null);
    setImage2Preview(getImageUrl(tour.image2_url) || null);
    setImage3Preview(getImageUrl(tour.image3_url) || null);
    setEditing(tour.id);
    setShowForm(true);
    await loadGallery(tour.id);
    await loadTranslations(tour.id);
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

  const handleImageChange = (e, field, setPreview) => {
    const file = e.target.files[0];
    if (!file) return;
    setForm(f => ({ ...f, [field]: file }));
    const reader = new FileReader();
    reader.onload = (ev) => setPreview(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleGalleryDragStart = (event, imageId) => {
    setDraggingGalleryId(imageId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(imageId));
  };

  const handleGalleryDrop = async (event, targetId) => {
    event.preventDefault();
    const sourceId = Number(event.dataTransfer.getData('text/plain')) || draggingGalleryId;
    setDraggingGalleryId(null);
    setGalleryDropTargetId(null);
    if (!sourceId || sourceId === targetId) return;

    const ordered = [...galleryImages];
    const fromIndex = ordered.findIndex((image) => image.id === sourceId);
    const toIndex = ordered.findIndex((image) => image.id === targetId);
    if (fromIndex === -1 || toIndex === -1) return;

    const [moved] = ordered.splice(fromIndex, 1);
    ordered.splice(toIndex, 0, moved);
    setGalleryImages(ordered);

    try {
      await toursAPI.reorderGallery(editing.id, ordered.map((image, index) => ({ id: image.id, order: index })));
      toast.success('Gallery order saved');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to save the new gallery order');
      loadGallery(editing.id);
    }
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
    } catch { toast.error('Failed to delete'); }
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
      if (form.image2 instanceof File) formData.append('image2', form.image2);
      if (form.image3 instanceof File) formData.append('image3', form.image3);

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
      toast.error('Failed to save tour');
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
    } catch { toast.error('Failed to delete tour'); }
  };

  if (!isAuthenticated || !isAdmin) return null;
  if (loading) return <div className="page"><div className="loading">Loading tours...</div></div>;

  const filtered = tours;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1>Manage Tours</h1>
        <p>{tours.length} tours total</p>
      </div>

      <div className="admin-toolbar">
        <div className="search-input-group">
          <Search size={16} />
          <input
            type="text"
            placeholder="Search tours..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search tours"
          />
        </div>
        <div className="search-input-group">
          <label className="sr-only" htmlFor="tour-ordering">Sort tours</label>
          <select
            id="tour-ordering"
            value={ordering}
            onChange={(e) => { setOrdering(e.target.value); setPage(1); }}
          >
            <option value="-created_at">Newest first</option>
            <option value="created_at">Oldest first</option>
            <option value="price">Price: low to high</option>
            <option value="-price">Price: high to low</option>
            <option value="duration">Duration</option>
            <option value="-duration">Longest duration</option>
          </select>
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

              <div className="form-image-row">
                <div className="form-group">
                  <label>Image 1 (Cover)</label>
                  <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => handleImageChange(e, 'image', setImagePreview)} />
                  {imagePreview && <img src={imagePreview} alt="Preview" className="image-preview" />}
                </div>
                <div className="form-group">
                  <label>Image 2</label>
                  <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => handleImageChange(e, 'image2', setImage2Preview)} />
                  {image2Preview && <img src={image2Preview} alt="Preview" className="image-preview" />}
                </div>
                <div className="form-group">
                  <label>Image 3</label>
                  <input type="file" accept=".jpg,.jpeg,.png" onChange={(e) => handleImageChange(e, 'image3', setImage3Preview)} />
                  {image3Preview && <img src={image3Preview} alt="Preview" className="image-preview" />}
                </div>
              </div>

              <div className="form-group">
                <label>Gallery Images (add as many as needed)</label>
                <div className="gallery-upload-grid">
                  {galleryImages.map(img => (
                    <div
                      key={img.id}
                      className={`gallery-thumb-item gallery-drag-item${draggingGalleryId === img.id ? ' dragging' : ''}${galleryDropTargetId === img.id ? ' drop-target' : ''}`}
                      draggable
                      onDragStart={(event) => handleGalleryDragStart(event, img.id)}
                      onDragOver={(event) => { event.preventDefault(); setGalleryDropTargetId(img.id); }}
                      onDragLeave={() => setGalleryDropTargetId(null)}
                      onDrop={(event) => handleGalleryDrop(event, img.id)}
                      onDragEnd={() => { setDraggingGalleryId(null); setGalleryDropTargetId(null); }}
                    >
                      <Image src={getImageUrl(img.image_url)} alt="" width={120} height={90} />
                      <span className="gallery-drag-hint">Drag to reorder</span>
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

              <div className="form-group">
                <label>Translations</label>
                <p className="form-hint">Add the tour in another language. Visitors can switch language on the tour page.</p>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="translation-locale">Language</label>
                    <select
                      id="translation-locale"
                      value={translationForm.locale}
                      onChange={(e) => setTranslationForm({ ...translationForm, locale: e.target.value })}
                    >
                      {['en', 'sw', 'fr', 'ar', 'de', 'es', 'zh'].map((locale) => (
                        <option key={locale} value={locale}>{locale}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="translation-title">Translated title</label>
                    <input
                      id="translation-title"
                      value={translationForm.title}
                      onChange={(e) => setTranslationForm({ ...translationForm, title: e.target.value })}
                    />
                  </div>
                </div>
                <div className="form-group">
                  <label htmlFor="translation-short">Short description</label>
                  <input
                    id="translation-short"
                    value={translationForm.short_description}
                    onChange={(e) => setTranslationForm({ ...translationForm, short_description: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="translation-description">Description</label>
                  <textarea
                    id="translation-description"
                    rows="3"
                    value={translationForm.description}
                    onChange={(e) => setTranslationForm({ ...translationForm, description: e.target.value })}
                  />
                </div>
                <button type="button" className="btn btn-outline" onClick={saveTranslation}>Save translation</button>
                {translations.length > 0 && (
                  <ul className="pending-list">
                    {translations.map((translation) => (
                      <li key={translation.locale}><strong>{translation.locale}</strong> {translation.title}</li>
                    ))}
                  </ul>
                )}
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
          <div className="table-responsive"><table>
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
                  <td>{t.image_url ? <Image src={getImageUrl(t.image_url)} alt="" width={60} height={40} className="admin-thumb" /> : '-'}</td>
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
          </table></div>
          <div className="table-pagination" role="navigation" aria-label="Tours pagination">
            <span>
              Page {page} of {totalPages} ({total} tours)
            </span>
            <div className="table-pagination-actions">
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                disabled={page <= 1}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                disabled={page >= totalPages}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
