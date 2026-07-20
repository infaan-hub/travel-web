import { useState, useEffect } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { workspacesAPI, toursAPI, travelDriversAPI, travelVehiclesAPI, hotelsAPI, roomsAPI, adminAPI } from '../api/axios';
import {
  ArrowLeft, Plus, X, Hotel, Globe, Truck, BedDouble, DollarSign,
  Check, Save, Search, Building2, MapPin, Phone, User, Calendar
} from 'lucide-react';

export default function AdminTourPlanPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const isNew = id === 'new';

  const [workspace, setWorkspace] = useState(null);
  const [tourist, setTourist] = useState(null);
  const [touristBookings, setTouristBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  const [activeSubTab, setActiveSubTab] = useState('tours');

  const [allTours, setAllTours] = useState([]);
  const [allDrivers, setAllDrivers] = useState([]);
  const [allVehicles, setAllVehicles] = useState([]);
  const [allHotels, setAllHotels] = useState([]);
  const [searchHotel, setSearchHotel] = useState('');
  const [searchTour, setSearchTour] = useState('');

  const [selectedTours, setSelectedTours] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [selectedRooms, setSelectedRooms] = useState([]);
  const [selectedTravelDriver, setSelectedTravelDriver] = useState(null);
  const [selectedTravelVehicle, setSelectedTravelVehicle] = useState(null);

  const [showHotelForm, setShowHotelForm] = useState(false);
  const [showRoomForm, setShowRoomForm] = useState(false);
  const [roomForm, setRoomForm] = useState({ name: '', price: '', description: '' });
  const [hotelForm, setHotelForm] = useState({ name: '', location: '', phone: '', image: null });
  const [savingHotel, setSavingHotel] = useState(false);
  const [savingRoom, setSavingRoom] = useState(false);

  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) { navigate('/admin/login'); return; }
    loadAllData();
  }, [isAuthenticated, isAdmin, navigate, id]);

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
          setTourist({ id: touristId, username: touristName, email: touristEmail });
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
    } catch (err) {
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
      alert('Workspace saved!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save workspace');
    }
  };

  const handleSubmitPricing = async () => {
    if (!workspace && !isNew) return;

    const toursPrice = selectedTours.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0);
    const roomsPrice = selectedRooms.reduce((sum, r) => sum + (parseFloat(r.price) || 0), 0);
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
        await workspacesAPI.update(ws.id, { total_price: totalPrice, notes });
      }

      navigate(`/admin/work-space/pricing/${ws.id}`, {
        state: {
          tourist,
          selectedTours,
          selectedHotel,
          selectedRooms,
          selectedTravelDriver,
          selectedTravelVehicle,
          totalPrice,
          notes,
        }
      });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit pricing');
    }
  };

  const toggleTour = (tour) => {
    setSelectedTours(prev => {
      const exists = prev.find(t => (t.id || t) === (tour.id || tour));
      if (exists) return prev.filter(t => (t.id || t) !== (tour.id || tour));
      return [...prev, tour];
    });
  };

  const handleAddHotel = async (e) => {
    e.preventDefault();
    setSavingHotel(true);
    try {
      const formData = new FormData();
      formData.append('name', hotelForm.name);
      formData.append('location', hotelForm.location);
      formData.append('phone', hotelForm.phone);
      if (hotelForm.image instanceof File) formData.append('image', hotelForm.image);
      const res = await hotelsAPI.create(formData);
      setAllHotels(prev => [...prev, res.data]);
      setShowHotelForm(false);
      setHotelForm({ name: '', location: '', phone: '', image: null });
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add hotel');
    } finally {
      setSavingHotel(false);
    }
  };

  const handleAddRoom = async (e) => {
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
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add room');
    } finally {
      setSavingRoom(false);
    }
  };

  const getTotalPrice = () => {
    const toursPrice = selectedTours.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0);
    const roomsPrice = selectedRooms.reduce((sum, r) => sum + (parseFloat(r.price) || 0), 0);
    return toursPrice + roomsPrice;
  };

  if (!isAuthenticated || !isAdmin) return null;
  if (loading) return <div className="page"><div className="loading">Loading workspace...</div></div>;

  const filteredTours = Array.isArray(allTours) ? allTours.filter(t =>
    t.title?.toLowerCase().includes(searchTour.toLowerCase())
  ) : [];

  const filteredHotels = Array.isArray(allHotels) ? allHotels.filter(h =>
    h.name?.toLowerCase().includes(searchHotel.toLowerCase()) ||
    h.location?.toLowerCase().includes(searchHotel.toLowerCase())
  ) : [];

  return (
    <div className="page admin-page">
      <div className="page-header">
        <div className="page-header-row">
          <button className="btn btn-outline" onClick={() => navigate('/admin/work-space')}>
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
          <span className="summary-label">Hotel</span>
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
          <Hotel size={16} /> Hotel
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
              <div className="search-input-group small">
                <Search size={14} />
                <input type="text" placeholder="Search tours..." value={searchTour} onChange={e => setSearchTour(e.target.value)} />
              </div>
            </div>
            {filteredTours.length === 0 ? (
              <p className="empty-text">No tours available</p>
            ) : (
              <div className="selection-grid">
                {filteredTours.map(tour => {
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
                  {selectedTours.map((tour, i) => (
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
              <h3>Select Hotel</h3>
              <button className="btn btn-primary btn-sm" onClick={() => setShowHotelForm(true)}>
                <Plus size={14} /> Add Hotel
              </button>
            </div>
            <div className="search-input-group small" style={{ marginBottom: '1rem' }}>
              <Search size={14} />
              <input type="text" placeholder="Search hotels in Zanzibar..." value={searchHotel} onChange={e => setSearchHotel(e.target.value)} />
            </div>
            {filteredHotels.length === 0 ? (
              <div className="empty-state">
                <Building2 size={48} />
                <p>No hotels found. Add a hotel or search for available options.</p>
              </div>
            ) : (
              <div className="hotel-list">
                {filteredHotels.map(hotel => (
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
                    {selectedRooms.map((room, i) => (
                      <div key={i} className="room-card">
                        <div className="room-info">
                          <span><BedDouble size={14} /> {room.name}</span>
                          <span className="room-price">${room.price}</span>
                        </div>
                        {room.description && <p className="room-desc">{room.description}</p>}
                        <button className="btn-icon danger" onClick={() => setSelectedRooms(prev => prev.filter((_, idx) => idx !== i))}>
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
                onChange={e => setNotes(e.target.value)}
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
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowHotelForm(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Hotel</h3>
              <button className="modal-close" onClick={() => setShowHotelForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddHotel}>
              <div className="form-group">
                <label>Hotel Name</label>
                <input type="text" required value={hotelForm.name} onChange={e => setHotelForm({ ...hotelForm, name: e.target.value })} placeholder="Hotel name" />
              </div>
              <div className="form-group">
                <label>Location</label>
                <input type="text" required value={hotelForm.location} onChange={e => setHotelForm({ ...hotelForm, location: e.target.value })} placeholder="Location in Zanzibar" />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" value={hotelForm.phone} onChange={e => setHotelForm({ ...hotelForm, phone: e.target.value })} placeholder="Phone number" />
              </div>
              <div className="form-group">
                <label>Image</label>
                <input type="file" accept="image/*" onChange={e => setHotelForm({ ...hotelForm, image: e.target.files[0] })} />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={savingHotel}>
                {savingHotel ? 'Saving...' : 'Add Hotel'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showRoomForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) setShowRoomForm(false); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>Add Room to {selectedHotel?.name}</h3>
              <button className="modal-close" onClick={() => setShowRoomForm(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleAddRoom}>
              <div className="form-group">
                <label>Room Name/Type</label>
                <input type="text" required value={roomForm.name} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })} placeholder="e.g. Deluxe Ocean View" />
              </div>
              <div className="form-group">
                <label>Price per Night ($)</label>
                <input type="number" required min="0" step="0.01" value={roomForm.price} onChange={e => setRoomForm({ ...roomForm, price: e.target.value })} placeholder="0.00" />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea value={roomForm.description} onChange={e => setRoomForm({ ...roomForm, description: e.target.value })} placeholder="Room description" rows={3} />
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
