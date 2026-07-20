import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { workspacesAPI, toursAPI, hotelsAPI } from '../api/axios';
import {
  ArrowLeft, CheckCircle, Circle, Globe, Hotel, Truck, BedDouble,
  User, DollarSign, Phone, Mail, MapPin
} from 'lucide-react';

export default function ViewWorkspacePage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();

  const [workspace, setWorkspace] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [activeDay, setActiveDay] = useState(1);
  const [allTours, setAllTours] = useState([]);
  const [allHotels, setAllHotels] = useState([]);

  useEffect(() => {
    if (!isAuthenticated || !isAdmin) { navigate('/admin/login'); return; }
    loadWorkspace();
  }, [isAuthenticated, isAdmin, navigate, id]);

  const loadWorkspace = async () => {
    setLoading(true);
    try {
      if (id && id !== 'new') {
        const [wsRes, toursRes, hotelsRes] = await Promise.all([
          workspacesAPI.getById(id).catch(() => null),
          toursAPI.getAll({}).catch(() => ({ data: [] })),
          hotelsAPI.getAll({}).catch(() => ({ data: [] })),
        ]);

        if (wsRes) {
          setWorkspace(wsRes.data);
          setAllTours(toursRes.data?.results || toursRes.data || []);
          setAllHotels(hotelsRes.data?.results || hotelsRes.data || []);
          generateTasks(wsRes.data);
        }
      }
    } catch (err) {
      console.error('Failed to load workspace:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateTasks = (ws) => {
    const selectedTourIds = ws.selected_tours || [];
    const selectedToursData = Array.isArray(allTours) ? allTours.filter(t => selectedTourIds.includes(t.id)) : [];

    const generatedTasks = [];
    const touristName = ws.tourist_name || 'Tourist';

    generatedTasks.push({
      id: 'arrival',
      day: 1,
      title: `${touristName} Arrival in Tanzania`,
      description: 'Pickup from airport and transfer to hotel',
      completed: false,
      icon: 'arrival'
    });

    for (let i = 0; i < selectedToursData.length; i++) {
      const tour = selectedToursData[i];
      generatedTasks.push({
        id: `tour-${tour.id || i}`,
        day: i + 2,
        title: `Day ${i + 2}: ${tour.title}`,
        description: `${tour.destination || 'Tour'} · Duration: ${tour.duration || 'Full day'}`,
        completed: false,
        icon: 'tour',
        tourId: tour.id
      });
    }

    if (ws.selected_hotel) {
      generatedTasks.push({
        id: 'hotel-checkin',
        day: 1,
        title: `Hotel Check-in: ${ws.selected_hotel_name || 'Hotel'}`,
        description: 'Check into accommodation',
        completed: false,
        icon: 'hotel'
      });
    }

    const multiDay = Math.max(selectedToursData.length + 2, 3);
    generatedTasks.push({
      id: 'departure',
      day: multiDay,
      title: `${touristName} Departure`,
      description: 'Transfer to airport and departure from Tanzania',
      completed: false,
      icon: 'departure'
    });

    setTasks(generatedTasks);
  };

  const toggleTask = (taskId) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    ));
  };

  const getDayTasks = (day) => tasks.filter(t => t.day === day);
  const allDays = [...new Set(tasks.map(t => t.day))].sort();

  const getTourById = (tourId) => allTours.find(t => t.id === tourId);
  const hotelData = workspace?.selected_hotel
    ? allHotels.find(h => h.id === workspace.selected_hotel)
    : null;

  if (!isAuthenticated || !isAdmin) return null;
  if (loading) return <div className="page"><div className="loading">Loading workspace...</div></div>;
  if (!workspace) return (
    <div className="page admin-page">
      <div className="empty-state">
        <h2>Workspace Not Found</h2>
        <p>The workspace you are looking for does not exist.</p>
        <button className="btn btn-primary" onClick={() => navigate('/admin/work-space')}>Go to Workspace</button>
      </div>
    </div>
  );

  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="page admin-page">
      <div className="page-header">
        <div className="page-header-row">
          <button className="btn btn-outline" onClick={() => navigate('/admin/work-space')}>
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1>Tour Workspace</h1>
            <p>{workspace.tourist_name || 'Tourist'} · {progress}% completed</p>
          </div>
        </div>
      </div>

      <div className="workspace-progress-bar">
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <span className="progress-text">{completedCount}/{totalCount} tasks completed</span>
      </div>

      <div className="workspace-summary-cards">
        <div className="ws-card">
          <User size={20} />
          <div>
            <span className="ws-card-label">Tourist</span>
            <span className="ws-card-value">{workspace.tourist_name || 'N/A'}</span>
          </div>
        </div>
        <div className="ws-card">
          <Mail size={20} />
          <div>
            <span className="ws-card-label">Email</span>
            <span className="ws-card-value">{workspace.tourist_email || 'N/A'}</span>
          </div>
        </div>
        <div className="ws-card">
          <DollarSign size={20} />
          <div>
            <span className="ws-card-label">Total Price</span>
            <span className="ws-card-value">${workspace.total_price || 0}</span>
          </div>
        </div>
        <div className="ws-card">
          <CheckCircle size={20} />
          <div>
            <span className="ws-card-label">Status</span>
            <span className={`ws-card-value status-${workspace.status || 'draft'}`}>{workspace.status || 'Draft'}</span>
          </div>
        </div>
      </div>

      <div className="workspace-tour-plan-detail">
        <h3>Tour Plan Overview</h3>
        <div className="workspace-items-grid">
          <div className="ws-item-card">
            <Globe size={18} />
            <span>Tours: {(workspace.selected_tours || []).length}</span>
          </div>
          <div className="ws-item-card">
            <Hotel size={18} />
            <span>Hotel: {hotelData?.name || workspace.selected_hotel_name || 'N/A'}</span>
          </div>
          <div className="ws-item-card">
            <BedDouble size={18} />
            <span>Rooms: {(workspace.selected_rooms || []).length}</span>
          </div>
          <div className="ws-item-card">
            <Truck size={18} />
            <span>Driver: {workspace.selected_travel_driver_name || workspace.selected_travel_driver || 'N/A'}</span>
          </div>
        </div>

        {workspace.selected_tours && workspace.selected_tours.length > 0 && (
          <div className="ws-tour-detail-list">
            <h4>Selected Tours</h4>
            {workspace.selected_tours.map((tourId, i) => {
              const tour = getTourById(tourId) || { id: tourId, title: `Tour #${tourId}` };
              return (
                <div key={i} className="ws-tour-item">
                  <Globe size={16} />
                  <div className="ws-tour-info">
                    <span>{tour.title}</span>
                    {tour.destination && <span className="ws-tour-meta"><MapPin size={12} /> {tour.destination}</span>}
                  </div>
                  <span className="ws-tour-price">${tour.price || 0}</span>
                </div>
              );
            })}
          </div>
        )}

        {hotelData && (
          <div className="ws-tour-detail-list">
            <h4>Hotel Details</h4>
            <div className="ws-tour-item">
              <Hotel size={16} />
              <div className="ws-tour-info">
                <span>{hotelData.name}</span>
                {hotelData.location && <span className="ws-tour-meta"><MapPin size={12} /> {hotelData.location}</span>}
              </div>
              {hotelData.phone && <span className="ws-tour-meta"><Phone size={12} /> {hotelData.phone}</span>}
            </div>
          </div>
        )}

        {workspace.notes && (
          <div className="ws-notes-section">
            <h4>Notes</h4>
            <p>{workspace.notes}</p>
          </div>
        )}
      </div>

      <div className="workspace-tasks-section">
        <div className="tasks-header">
          <h3>Day-by-Day Plan</h3>
          <div className="day-selector">
            {allDays.map(day => (
              <button
                key={day}
                className={`day-btn ${activeDay === day ? 'active' : ''}`}
                onClick={() => setActiveDay(day)}
              >
                Day {day}
              </button>
            ))}
          </div>
        </div>

        <div className="tasks-list">
          {getDayTasks(activeDay).length === 0 ? (
            <p className="empty-text">No tasks for this day</p>
          ) : getDayTasks(activeDay).map(task => (
            <div
              key={task.id}
              className={`task-card ${task.completed ? 'completed' : ''}`}
              onClick={() => toggleTask(task.id)}
            >
              <div className="task-check">
                {task.completed ? <CheckCircle size={22} className="check-icon done" /> : <Circle size={22} className="check-icon pending" />}
              </div>
              <div className="task-content">
                <span className="task-title">{task.title}</span>
                <span className="task-description">{task.description}</span>
              </div>
              <div className="task-day-badge">Day {task.day}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
