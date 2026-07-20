import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { travelDriversAPI, travelVehiclesAPI } from '../api/axios';
import { Car, Plus, Pencil, Trash2, Search, X, User } from 'lucide-react';

export default function AdminTravelPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('drivers');
  const [drivers, setDrivers] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [showDriverForm, setShowDriverForm] = useState(false);
  const [editingDriver, setEditingDriver] = useState(null);
  const [driverForm, setDriverForm] = useState({ name: '', phone: '', image: null });
  const [savingDriver, setSavingDriver] = useState(false);

  const [showVehicleForm, setShowVehicleForm] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({ car_name: '', plate_number: '' });
  const [savingVehicle, setSavingVehicle] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) { navigate('/admin/login'); return; }
    loadData();
  }, [isAuthenticated, isAdmin, navigate]);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      travelDriversAPI.getAll().catch(() => ({ data: [] })),
      travelVehiclesAPI.getAll().catch(() => ({ data: [] })),
    ]).then(([driversRes, vehiclesRes]) => {
      const driversData = driversRes.data?.results || driversRes.data || [];
      const vehiclesData = vehiclesRes.data?.results || vehiclesRes.data || [];
      if (Array.isArray(driversData)) setDrivers(driversData);
      if (Array.isArray(vehiclesData)) setVehicles(vehiclesData);
    }).finally(() => setLoading(false));
  };

  const resetDriverForm = () => {
    setDriverForm({ name: '', phone: '', image: null });
    setEditingDriver(null);
    setShowDriverForm(false);
  };

  const resetVehicleForm = () => {
    setVehicleForm({ car_name: '', plate_number: '' });
    setEditingVehicle(null);
    setShowVehicleForm(false);
  };

  const handleDriverSubmit = async (e) => {
    e.preventDefault();
    setSavingDriver(true);
    try {
      const formData = new FormData();
      formData.append('name', driverForm.name);
      formData.append('phone', driverForm.phone);
      if (driverForm.image instanceof File) formData.append('image', driverForm.image);
      if (editingDriver) {
        await travelDriversAPI.update(editingDriver.id, formData);
      } else {
        await travelDriversAPI.create(formData);
      }
      resetDriverForm();
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save driver');
    } finally {
      setSavingDriver(false);
    }
  };

  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    setSavingVehicle(true);
    try {
      if (editingVehicle) {
        await travelVehiclesAPI.update(editingVehicle.id, vehicleForm);
      } else {
        await travelVehiclesAPI.create(vehicleForm);
      }
      resetVehicleForm();
      loadData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save vehicle');
    } finally {
      setSavingVehicle(false);
    }
  };

  const handleDeleteDriver = async (id) => {
    if (!window.confirm('Delete this driver?')) return;
    try {
      await travelDriversAPI.delete(id);
      loadData();
    } catch { alert('Failed to delete driver'); }
  };

  const handleDeleteVehicle = async (id) => {
    if (!window.confirm('Delete this vehicle?')) return;
    try {
      await travelVehiclesAPI.delete(id);
      loadData();
    } catch { alert('Failed to delete vehicle'); }
  };

  const editDriver = (driver) => {
    setEditingDriver(driver);
    setDriverForm({ name: driver.name, phone: driver.phone, image: null });
    setShowDriverForm(true);
  };

  const editVehicle = (vehicle) => {
    setEditingVehicle(vehicle);
    setVehicleForm({ car_name: vehicle.car_name, plate_number: vehicle.plate_number });
    setShowVehicleForm(true);
  };

  if (!isAuthenticated || !isAdmin) return null;

  const filteredDrivers = drivers.filter(d =>
    d.name?.toLowerCase().includes(search.toLowerCase()) ||
    d.phone?.includes(search)
  );
  const filteredVehicles = vehicles.filter(v =>
    v.car_name?.toLowerCase().includes(search.toLowerCase()) ||
    v.plate_number?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page admin-page">
      <div className="page-header">
        <h1>Manage Travel</h1>
        <p>Add and manage travel drivers and vehicles</p>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab ${activeTab === 'drivers' ? 'active' : ''}`} onClick={() => setActiveTab('drivers')}>
          <User size={16} /> Drivers
        </button>
        <button className={`admin-tab ${activeTab === 'vehicles' ? 'active' : ''}`} onClick={() => setActiveTab('vehicles')}>
          <Car size={16} /> Vehicles
        </button>
      </div>

      <div className="admin-toolbar">
        <div className="search-input-group">
          <Search size={16} />
          <input type="text" placeholder={`Search ${activeTab}...`} value={search} onChange={e => setSearch(e.target.value)} />
          {search && <button className="search-clear" onClick={() => setSearch('')}><X size={14} /></button>}
        </div>
        <button className="btn btn-primary" onClick={() => activeTab === 'drivers' ? setShowDriverForm(true) : setShowVehicleForm(true)}>
          <Plus size={16} /> Add {activeTab === 'drivers' ? 'Driver' : 'Vehicle'}
        </button>
      </div>

      {activeTab === 'drivers' && (
        <>
          {loading ? <div className="loading">Loading drivers...</div> : (
            <div className="travel-cards-grid">
              {filteredDrivers.length === 0 ? (
                <div className="empty-state"><p>No drivers found</p></div>
              ) : filteredDrivers.map(driver => (
                <div key={driver.id} className="travel-card">
                  <div className="travel-card-header">
                    <div className="travel-card-avatar">
                      {driver.image ? (
                        <img src={driver.image} alt={driver.name} />
                      ) : (
                        <User size={32} />
                      )}
                    </div>
                    <div className="travel-card-info">
                      <h3 className="travel-card-name">{driver.name}</h3>
                      <span className="travel-card-phone">{driver.phone}</span>
                    </div>
                  </div>
                  <div className="travel-card-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => editDriver(driver)}><Pencil size={14} /> Edit</button>
                    <button className="btn btn-outline btn-sm btn-danger" onClick={() => handleDeleteDriver(driver.id)}><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'vehicles' && (
        <>
          {loading ? <div className="loading">Loading vehicles...</div> : (
            <div className="travel-cards-grid">
              {filteredVehicles.length === 0 ? (
                <div className="empty-state"><p>No vehicles found</p></div>
              ) : filteredVehicles.map(vehicle => (
                <div key={vehicle.id} className="travel-card">
                  <div className="travel-card-header">
                    <div className="travel-card-avatar vehicle">
                      <Car size={32} />
                    </div>
                    <div className="travel-card-info">
                      <h3 className="travel-card-name">{vehicle.car_name}</h3>
                      <span className="travel-card-phone">{vehicle.plate_number}</span>
                    </div>
                  </div>
                  <div className="travel-card-actions">
                    <button className="btn btn-outline btn-sm" onClick={() => editVehicle(vehicle)}><Pencil size={14} /> Edit</button>
                    <button className="btn btn-outline btn-sm btn-danger" onClick={() => handleDeleteVehicle(vehicle.id)}><Trash2 size={14} /> Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {showDriverForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) resetDriverForm(); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingDriver ? 'Edit Driver' : 'Add Driver'}</h3>
              <button className="modal-close" onClick={resetDriverForm}><X size={18} /></button>
            </div>
            <form onSubmit={handleDriverSubmit}>
              <div className="form-group">
                <label>Driver Name</label>
                <input type="text" required value={driverForm.name} onChange={e => setDriverForm({ ...driverForm, name: e.target.value })} placeholder="Enter driver name" />
              </div>
              <div className="form-group">
                <label>Phone Number</label>
                <input type="text" required value={driverForm.phone} onChange={e => setDriverForm({ ...driverForm, phone: e.target.value })} placeholder="Enter phone number" />
              </div>
              <div className="form-group">
                <label>Driver Image</label>
                <input type="file" accept="image/*" onChange={e => setDriverForm({ ...driverForm, image: e.target.files[0] })} />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={savingDriver}>
                {savingDriver ? 'Saving...' : editingDriver ? 'Update Driver' : 'Add Driver'}
              </button>
            </form>
          </div>
        </div>
      )}

      {showVehicleForm && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) resetVehicleForm(); }}>
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingVehicle ? 'Edit Vehicle' : 'Add Vehicle'}</h3>
              <button className="modal-close" onClick={resetVehicleForm}><X size={18} /></button>
            </div>
            <form onSubmit={handleVehicleSubmit}>
              <div className="form-group">
                <label>Car Name</label>
                <input type="text" required value={vehicleForm.car_name} onChange={e => setVehicleForm({ ...vehicleForm, car_name: e.target.value })} placeholder="Enter car name/model" />
              </div>
              <div className="form-group">
                <label>Plate Number</label>
                <input type="text" required value={vehicleForm.plate_number} onChange={e => setVehicleForm({ ...vehicleForm, plate_number: e.target.value })} placeholder="Enter plate number" />
              </div>
              <button type="submit" className="btn btn-primary btn-block" disabled={savingVehicle}>
                {savingVehicle ? 'Saving...' : editingVehicle ? 'Update Vehicle' : 'Add Vehicle'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
