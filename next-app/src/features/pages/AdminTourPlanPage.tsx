"use client";

import {
 useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { workspacesAPI, toursAPI, travelDriversAPI, travelVehiclesAPI, hotelsAPI, roomsAPI, adminAPI } from '@/lib/api/client';
import {
  ArrowLeft, Plus, X, Hotel, Globe, Truck, BedDouble, DollarSign,
  Check, Save, Building2, MapPin, Phone, User, Calendar
} from '@/components/icons';

import { useToast } from "@/components/ToastProvider";

import { isFile } from "@/features/pages/types";
import type {  Booking, Customer, Hotel as HotelType, Room, Tour, TravelDriver, TravelVehicle, Workspace  } from "@/features/pages/types";
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
export default function AdminTourPlanPage() {
  const toast = useToast();
  const { isAuthenticated, isAdmin, loading: authLoading } = useAuth();
  const router = useRouter();
  const { id } = useParams<Record<string, string>>();
  const searchParams = useSearchParams();
  const isNew = id === 'new';

  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [tourist, setTourist] = useState<Customer | null>(null);
  const [touristBookings, setTouristBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  const [activeSubTab, setActiveSubTab] = useState('tours');

  const [allTours, setAllTours] = useState<Tour[]>([]);
  const [allDrivers, setAllDrivers] = useState<TravelDriver[]>([]);
  const [allVehicles, setAllVehicles] = useState<TravelVehicle[]>([]);
  const [allHotels, setAllHotels] = useState<HotelType[]>([]);

  const [selectedTours, setSelectedTours] = useState<Tour[]>([]);
  const [selectedHotel, setSelectedHotel] = useState<HotelType | null>(null);
  const [selectedRooms, setSelectedRooms] = useState<Room[]>([]);
  const [selectedTravelDriver, setSelectedTravelDriver] = useState<TravelDriver | null>(null);
  const [selectedTravelVehicle, setSelectedTravelVehicle] = useState<TravelVehicle | null>(null);

  const [showHotelForm, setShowHotelForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomForm, setRoomForm] = useState<{ name: string; price: string; description: string }>({ name: '', price: '', description: '' });
  const [hotelForm, setHotelForm] = useState<{ name: string; location: string; phone: string; image: File | null }>({ name: '', location: '', phone: '', image: null });
  const [savingHotel, setSavingHotel] = useState(false);
  const [savingRoom, setSavingRoom] = useState(false);

  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated || !isAdmin) { router.push('/login'); return; }
    loadAllData();
  }, [isAuthenticated, isAdmin, router, id]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const touristId = searchParams.get('tourist');
      const touristName = searchParams.get('name');
      const touristEmail = searchParams.get('email');

      if (touristId && isNew) {
        const usersRes = await adminAPI.getAllUsers().catch(() => ({ data: [] }));
        const users = usersRes.data?.results || usersRes.data || [];
        const found = Array.isArray(users) ? users.find(u => u.id == touristId) : null;
        if (found) {
          setTourist(found);
          const bookingsRes = await adminAPI.getAllBookings().catch(() => ({ data: [] }));
          const bookings = bookingsRes.data?.results || bookingsRes.data || [];
          const userBookings = Array.isArray(bookings) ? bookings.filter(b => b.user === found.id || b.email === found.email) : [];
          setTouristBookings(userBookings);
        } else {
          setTourist({ id: Number(touristId), username: touristName ?? '', email: touristEmail ?? '', is_staff: false } as Customer);
        }
      } else if (id && !isNew) {
        const wsRes = await workspacesAPI.getById(id);
        setWorkspace(wsRes.data);
        if (wsRes.data.selected_tours) setSelectedTours(wsRes.data.selected_tours);
        if (wsRes.data.selected_hotel) setSelectedHotel(wsRes.data.selected_hotel);
        if (wsRes.data.selected_rooms) setSelectedRooms(wsRes.data.selected_rooms);
        if (wsRes.data.selected_travel_driver) setSelectedTravelDriver(wsRes.data.selected_travel_driver);
        if (wsRes.data.selected_travel_vehicle) setSelectedTravelVehicle(wsRes.data.selected_travel_vehicle);
        if (wsRes.data.notes) setNotes(wsRes.data.notes);
      }

      const [toursRes, driversRes, vehiclesRes, hotelsRes] = await Promise.all([
        toursAPI.getAll({}).catch(() => ({ data: [] })),
        travelDriversAPI.getAll().catch(() => ({ data: [] })),
        travelVehiclesAPI.getAll().catch(() => ({ data: [] })),
        hotelsAPI.getAll({}).catch(() => ({ data: [] })),
      ]);

      setAllTours(toursRes.data?.results || toursRes.data || []);
      setAllDrivers(driversRes.data?.results || driversRes.data || []);
      setAllVehicles(vehiclesRes.data?.results || vehiclesRes.data || []);
      setAllHotels(hotelsRes.data?.results || hotelsRes.data || []);
    } catch (err: any) {
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        tourist_id: tourist?.id,
        tourist_name: tourist?.username,
        tourist_email: tourist?.email,
        selected_tours: selectedTours.map(t => t.id || t),
        selected_hotel: selectedHotel?.id || null,
        selected_rooms: selectedRooms.map(r => r.id).filter(Boolean),
        selected_travel_driver: selectedTravelDriver?.id || null,
        selected_travel_vehicle: selectedTravelVehicle?.id || null,
        notes,
        status: 'draft',
      };

      if (isNew || !workspace) {
        const res = await workspacesAPI.create(payload);
        setWorkspace(res.data);
      } else {
        await workspacesAPI.update(workspace.id, payload);
      }
      toast.success('Workspace saved!');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to save workspace');
    }
  };

  const handleSubmitPricing = async () => {
    if (!workspace && !isNew) return;

    const toursPrice = selectedTours.reduce((sum: any, t: Tour) => sum + (parseFloat(String(t.price)) || 0), 0);
    const roomsPrice = selectedRooms.reduce((sum: any, r: any) => sum + (parseFloat(String(r.price)) || 0), 0);
    const totalPrice = toursPrice + roomsPrice;

    try {
      let ws = workspace;
      if (isNew || !workspace) {
        const payload = {
          tourist_id: tourist?.id,
          tourist_name: tourist?.username,
          tourist_email: tourist?.email,
          selected_tours: selectedTours.map(t => t.id || t),
          selected_hotel: selectedHotel?.id || null,
          selected_rooms: selectedRooms.map(r => r.id).filter(Boolean),
          selected_travel_driver: selectedTravelDriver?.id || null,
          selected_travel_vehicle: selectedTravelVehicle?.id || null,
          notes,
          status: 'draft',
          total_price: totalPrice,
        };
        const res = await workspacesAPI.create(payload);
        ws = res.data;
        setWorkspace(ws);
      } else {
        if (!ws) return;
        await workspacesAPI.update(ws.id, { total_price: totalPrice, notes });
      }

      const draft = {
        tourist,
        selectedTours,
        selectedHotel,
        selectedRooms,
        selectedTravelDriver,
        selectedTravelVehicle,
        totalPrice,
        notes,
      };
      if (!ws) return;
      sessionStorage.setItem(`pricing:${ws.id}`, JSON.stringify(draft));
      try {
        await workspacesAPI.savePricingDraft(ws.id, draft);
      } catch {
        // The local copy is used as a fallback.
      }
      router.push(`/admin/work-space/pricing/${ws.id}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to submit pricing');
    }
  };

  const toggleTour = (tour: Tour) => {
    setSelectedTours(prev => {
      const exists = prev.find(t => (t.id || t) === (tour.id || tour));
      if (exists) return prev.filter(t => (t.id || t) !== (tour.id || tour));
      return [...prev, tour];
    });
  };

  const handleAddHotel = async (e: FormEvent<HTMLElement>) => {
    e.preventDefault();
    setSavingHotel(true);
    try {
      const formData = new FormData();
      formData.append('name', hotelForm.name);
      formData.append('location', hotelForm.location);
      formData.append('phone', hotelForm.phone);
      if (isFile(hotelForm.image)) formData.append('image', hotelForm.image);
      const res = await hotelsAPI.create(formData);
      setAllHotels(prev => [...prev, res.data]);
      setShowHotelForm(false);
      setHotelForm({ name: '', location: '', phone: '', image: null });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add hotel');
    } finally {
      setSavingHotel(false);
    }
  };

  const handleAddRoom = async (e: FormEvent<HTMLElement>) => {
    e.preventDefault();
    setSavingRoom(true);
    try {
      const res = await roomsAPI.create({
        hotel: selectedHotel?.id,
        name: roomForm.name,
        price: roomForm.price,
        description: roomForm.description,
      });
      setSelectedRooms(prev => [...prev, res.data]);
      setShowRoomForm(false);
      setRoomForm({ name: '', price: '', description: '' });
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to add room');
    } finally {
      setSavingRoom(false);
    }
  };

  const getTotalPrice = () => {
    const toursPrice = selectedTours.reduce((sum: any, t: Tour) => sum + (parseFloat(String(t.price)) || 0), 0);
    const roomsPrice = selectedRooms.reduce((sum: any, r: any) => sum + (parseFloat(String(r.price)) || 0), 0);
    return toursPrice + roomsPrice;
  };

  if (!isAuthenticated || !isAdmin) return null;
  if (loading) return <div className="page"><div className="loading">Loading workspace...</div></div>;

  return (
    <div className="page admin-page">
      <div className="page-header">
        <div className="page-header-row">
          <button className="btn btn-outline" onClick={() => router.push('/admin/work-space')}>
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1>Tour Planning</h1>
            <p>{tourist?.username || 'Tourist'} · {touristBookings.length} booking(s)</p>
          </div>
        </div>
      </div>

      {touristBookings.length > 0 && (
        <div className="existing-bookings-bar">
          <h4>Existing Bookings</h4>
          <div className="existing-booking-chips">
            {touristBookings.map(b => (
              <span key={b.id} className="booking-chip">
                <Globe size={14} /> {b.tour_title || 'Tour'} · {new Date(b.travel_date).toLocaleDateString()}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="tour-plan-summary">
        <div className="summary-card">
          <span className="summary-label">Tours</span>
          <span className="summary-value">{selectedTours.length}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">HotelType</span>
          <span className="summary-value">{selectedHotel ? '✓' : '—'}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Rooms</span>
          <span className="summary-value">{selectedRooms.length}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Driver</span>
          <span className="summary-value">{selectedTravelDriver ? '✓' : '—'}</span>
        </div>
        <div className="summary-card">
          <span className="summary-label">Vehicle</span>
          <span className="summary-value">{selectedTravelVehicle ? '✓' : '—'}</span>
        </div>
        <div className="summary-card highlight">
          <span className="summary-label">Total</span>
          <span className="summary-value">${getTotalPrice()}</span>
        </div>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${activeSubTab === 'tours' ? 'active' : ''}`} onClick={() => setActiveSubTab('tours')}>
          <Globe size={16} /> Tours
        </button>
        <button className={`admin-tab ${activeSubTab === 'hotel' ? 'active' : ''}`} onClick={() => setActiveSubTab('hotel')}>
          <Hotel size={16} /> HotelType
        </button>
        <button className={`admin-tab ${activeSubTab === 'travel' ? 'active' : ''}`} onClick={() => setActiveSubTab('travel')}>
          <Truck size={16} /> Travel
        </button>
        <button className={`admin-tab ${activeSubTab === 'notes' ? 'active' : ''}`} onClick={() => setActiveSubTab('notes')}>
          <Calendar size={16} /> Notes
        </button>
      </div>

      <div className="tour-plan-content">
        {activeSubTab === 'tours' && (
          <div className="sub-panel">
            <div className="panel-header">
              <h3>Select Tours</h3>
            </div>
            {allTours.length === 0 ? (
              <p className="empty-text">No tours available</p>
            ) : (
              <div className="selection-grid">
                {allTours.map(tour => {
                  const isSelected = selectedTours.find(t => (t.id || t) === (tour.id || tour));
                  return (
                    <div
                      key={tour.id}
                      className={`selection-card ${isSelected ? 'selected' : ''}`}
                      onClick={() => toggleTour(tour)}
                    >
                      <div className="selection-card-header">
                        <span className="selection-check">{isSelected ? <Check size={16} /> : null}</span>
                        <span className="selection-title">{tour.title}</span>
                      </div>
                      <div className="selection-card-body">
                        <span className="selection-destination"><MapPin size={12} /> {tour.destination}</span>
                        <span className="selection-price">${tour.price}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {selectedTours.length > 0 && (
              <div className="selected-summary">
                <h4>Selected Tours ({selectedTours.length})</h4>
                <div className="selected-list">
                  {selectedTours.map((tour: Tour, i: number) => (
                    <span key={i} className="selected-chip">
                      {tour.title || `Tour #${tour.id || tour}`}
                      <button onClick={() => toggleTour(tour)}><X size={12} /></button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'hotel' && (
          <div className="sub-panel">
            <div className="panel-header">
              <h3>Select HotelType</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowHotelForm(true)}>
                <Plus size={14} /> Add HotelType
              </button>
            </div>
            {allHotels.length === 0 ? (
              <div className="empty-state">
                <Building2 size={48} />
                <p>No hotels found. Add a hotel to get started.</p>
              </div>
            ) : (
              <div className="hotel-list">
                {allHotels.map(hotel => (
                  <div
                    key={hotel.id}
                    className={`hotel-card ${selectedHotel?.id === hotel.id ? 'selected' : ''}`}
                    onClick={() => setSelectedHotel(hotel)}
                  >
                    <div className="hotel-card-header">
                      <div className="hotel-info">
                        <h4>{hotel.name}</h4>
                        <span className="hotel-location"><MapPin size={12} /> {hotel.location}</span>
                      </div>
                      {selectedHotel?.id === hotel.id && <Check size={20} className="selected-badge" />}
                    </div>
                    {hotel.phone && <span className="hotel-phone"><Phone size={12} /> {hotel.phone}</span>}
                    {hotel.rooms && hotel.rooms.length > 0 && (
                      <div className="hotel-rooms">
                        <span className="room-count">{hotel.rooms.length} room(s)</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {selectedHotel && (
              <div className="selected-hotel-section">
                <h4>Selected: {selectedHotel.name}</h4>
                <button className="btn btn-primary btn-sm" onClick={() => setShowRoomForm(true)}>
                  <Plus size={14} /> Add Room
                </button>
                {selectedRooms.length > 0 && (
                  <div className="room-list">
                    {selectedRooms.map((room: Room, i: number) => (
                      <div key={i} className="room-card">
                        <div className="room-info">
                          <span><BedDouble size={14} /> {room.name}</span>
                          <span className="room-price">${room.price}</span>
                        </div>
                        {room.description && <p className="room-desc">{room.description}</p>}
                        <button className="btn-icon danger" onClick={() => setSelectedRooms(prev => prev.filter((_: any, idx: any) => idx !== i))}>
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeSubTab === 'travel' && (
          <div className="sub-panel">
            <div className="panel-header">
              <h3>Assign Travel</h3>
            </div>
            <div className="form-section">
              <h4>Select Driver</h4>
              <div className="selection-grid compact">
                {allDrivers.length === 0 ? (
                  <p className="empty-text">No drivers available. Add them in Manage Travel.</p>
                ) : allDrivers.map(driver => (
                  <div
                    key={driver.id}
                    className={`selection-card ${selectedTravelDriver?.id === driver.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTravelDriver(driver)}
                  >
                    <div className="selection-card-header">
                      <span className="selection-check">{selectedTravelDriver?.id === driver.id ? <Check size={16} /> : null}</span>
                      <span className="selection-title"><User size={14} /> {driver.name}</span>
                    </div>
                    <div className="selection-card-body">
                      <span><Phone size={12} /> {driver.phone}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="form-section">
              <h4>Select Vehicle</h4>
              <div className="selection-grid compact">
                {allVehicles.length === 0 ? (
                  <p className="empty-text">No vehicles available. Add them in Manage Travel.</p>
                ) : allVehicles.map(vehicle => (
                  <div
                    key={vehicle.id}
                    className={`selection-card ${selectedTravelVehicle?.id === vehicle.id ? 'selected' : ''}`}
                    onClick={() => setSelectedTravelVehicle(vehicle)}
                  >
                    <div className="selection-card-header">
                      <span className="selection-check">{selectedTravelVehicle?.id === vehicle.id ? <Check size={16} /> : null}</span>
                      <span className="selection-title"><Truck size={14} /> {vehicle.car_name}</span>
                    </div>
                    <div className="selection-card-body">
                      <span>{vehicle.plate_number}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeSubTab === 'notes' && (
          <div className="sub-panel">
            <div className="panel-header">
              <h3>Planning Notes</h3>
            </div>
            <div className="form-group">
              <textarea
                rows={8}
                value={notes}
                onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setNotes(e.target.value)}
                placeholder="Add notes about the tour plan, special requirements, pickup details, etc..."
                style={{ width: '100%', padding: '1rem', borderRadius: '8px', border: '1px solid var(--border-color)', resize: 'vertical' }}
              />
            </div>
          </div>
        )}
      </div>

      <div className="tour-plan-actions">
        <button className="btn btn-outline" onClick={handleSave}>
          <Save size={16} /> Save Draft
        </button>
        <button className="btn btn-primary btn-large" onClick={handleSubmitPricing}>
          <DollarSign size={16} /> Submit & View Pricing
        </button>
      </div>

      {showHotelForm && (
        <div className="modal-overlay" onClick={(e: MouseEvent<HTMLElement>) => { if (e.target === e.currentTarget) setShowHotelForm(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add HotelType</h3>
              <button className="modal-close" onClick={() => setShowHotelForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddHotel}>
              <div className="form-group">
                <label>HotelType Name</label>
                <input type="text" required value={hotelForm.name} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setHotelForm({ ...hotelForm, name: e.target.value })} placeholder="HotelType name" />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input type="text" required value={hotelForm.location} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setHotelForm({ ...hotelForm, location: e.target.value })} placeholder="Location in Zanzibar" />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" value={hotelForm.phone} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setHotelForm({ ...hotelForm, phone: e.target.value })} placeholder="Phone number" />
              </div>
              <div className="form-group">
                <label>Image</label>
                <input type="file" accept="image/*" onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setHotelForm({ ...hotelForm, image: (e.currentTarget as HTMLInputElement).files?.[0] ?? null })} />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={savingHotel}>
                {savingHotel ? 'Saving...' : 'Add HotelType'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showRoomForm && (
        <div className="modal-overlay" onClick={(e: MouseEvent<HTMLElement>) => { if (e.target === e.currentTarget) setShowRoomForm(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Room to {selectedHotel?.name}</h3>
              <button className="modal-close" onClick={() => setShowRoomForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddRoom}>
              <div className="form-group">
                <label>Room Name/Type</label>
                <input type="text" required value={roomForm.name} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setRoomForm({ ...roomForm, name: e.target.value })} placeholder="e.g. Deluxe Ocean View" />
              </div>
              <div className="form-group">
                <label>Price per Night ($)</label>
                <input type="number" required min="0" step="0.01" value={roomForm.price} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setRoomForm({ ...roomForm, price: e.target.value })} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={roomForm.description} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setRoomForm({ ...roomForm, description: e.target.value })} placeholder="Room description" rows={3} />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={savingRoom}>
                {savingRoom ? 'Saving...' : 'Add Room'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}