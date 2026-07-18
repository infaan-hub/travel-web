import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { toursAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ClipboardList, MapPin, Users, DollarSign, CalendarDays, CheckCircle, Navigation, Clock, X, ChevronLeft, ChevronRight, Star } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

function BookingGallery({ tourId, mainImage }) {
  const [galleryUrls, setGalleryUrls] = useState([]);
  const [current, setCurrent] = useState(0);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (tourId) {
      toursAPI.getGallery(tourId).then(res => {
        const imgs = res.data.gallery_images || res.data.results || res.data;
        const urls = [];
        if (mainImage) urls.push(mainImage);
        imgs.forEach(img => { if (img.image_url) urls.push(getImageUrl(img.image_url)); });
        setGalleryUrls(urls);
      }).catch(() => {});
    }
  }, [tourId, mainImage]);

  if (!galleryUrls.length) return null;

  return (
    <div className="booking-gallery">
      <div className="gallery-thumbs">
        {galleryUrls.map((url, i) => (
          <img key={i} src={url} alt="" className={i === current ? 'active' : ''}
            onClick={() => { setCurrent(i); setOpen(true); }} />
        ))}
      </div>
      {open && (
        <div className="gallery-modal" onClick={() => setOpen(false)}>
          <span className="gallery-close-btn" onClick={() => setOpen(false)}><X size={24} /></span>
          <button className="gallery-nav gallery-prev" onClick={(e) => { e.stopPropagation(); setCurrent(c => (c - 1 + galleryUrls.length) % galleryUrls.length); }}><ChevronLeft size={24} /></button>
          <img src={galleryUrls[current]} alt="" onClick={(e) => e.stopPropagation()} />
          <button className="gallery-nav gallery-next" onClick={(e) => { e.stopPropagation(); setCurrent(c => (c + 1) % galleryUrls.length); }}><ChevronRight size={24} /></button>
          <div className="gallery-counter">{current + 1} / {galleryUrls.length}</div>
        </div>
      )}
    </div>
  );
}

export default function BookingsPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    api.get('/bookings/')
      .then((res) => setBookings(res.data.results || res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [isAuthenticated, navigate]);

  const handleCancel = async (id) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        await api.patch(`/bookings/${id}/`, { status: 'cancelled' });
        setBookings(bookings.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
      } catch { alert('Failed to cancel booking'); }
    }
  };

  const openGoogleMaps = (booking) => {
    if (booking.google_maps_url) {
      window.open(booking.google_maps_url, '_blank');
    } else if (booking.user_lat && booking.user_lng && booking.tour_destination_lat && booking.tour_destination_lng) {
      const url = `https://www.google.com/maps/dir/${booking.user_lat},${booking.user_lng}/${booking.tour_destination_lat},${booking.tour_destination_lng}`;
      window.open(url, '_blank');
    } else {
      alert('Location data not available for this booking');
    }
  };

  const statusClass = (status) => {
    switch (status) {
      case 'confirmed': return 'status-confirmed';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-pending';
    }
  };

  return (
    <div className="page bookings-page">
      <div className="page-header">
        <h1>My Booked Trips</h1>
        <p>Manage your tour bookings</p>
      </div>

      {loading ? (
        <div className="loading">Loading your bookings...</div>
      ) : bookings.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon"><ClipboardList size={24} /></span>
          <h3>No Bookings Yet</h3>
          <p>You haven't made any bookings yet. Start exploring our tours!</p>
          <button className="btn btn-primary" onClick={() => navigate('/tours')}>
            Browse Tours
          </button>
        </div>
      ) : (
        <div className="bookings-list">
          {bookings.map((booking) => (
            <div key={booking.id} className="booking-card-item" onClick={() => setExpandedId(expandedId === booking.id ? null : booking.id)}>
              <div className="booking-card-image">
                <img
                  src={getImageUrl(booking.tour_image) || ''}
                  alt={booking.tour_title}
                />
              </div>
              <div className="booking-card-content">
                <div className="booking-card-header">
                  <h3>{booking.tour_title}</h3>
                  <span className={`booking-status ${statusClass(booking.status)}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>
                <div className="booking-card-details">
                  <span><CalendarDays size={14} /> Booked: {new Date(booking.created_at).toLocaleDateString()}</span>
                  <span><MapPin size={14} /> Travel: {new Date(booking.travel_date).toLocaleDateString()}</span>
                  <span><MapPin size={14} /> {booking.tour_destination}</span>
                  <span><Users size={14} /> Travelers: {booking.travelers}</span>
                  <span><DollarSign size={14} /> Total: ${booking.total_price}</span>
                  {booking.distance_km && <span><Navigation size={14} /> Distance: ~{booking.distance_km} km</span>}
                  {booking.estimated_time_mins && (
                    <span><Clock size={14} /> Est. time: ~{Math.floor(booking.estimated_time_mins / 60)}h {booking.estimated_time_mins % 60}m</span>
                  )}
                </div>

                {expandedId === booking.id && (
                  <div className="booking-expanded">
                    <div className="booking-actions">
                      <button className="btn btn-sm btn-outline" onClick={(e) => { e.stopPropagation(); openGoogleMaps(booking); }}>
                        <Navigation size={14} /> View Route
                      </button>
                      {booking.status === 'pending' && (
                        <button className="btn btn-sm btn-danger" onClick={(e) => { e.stopPropagation(); handleCancel(booking.id); }}>
                          Cancel Booking
                        </button>
                      )}
                      {booking.status === 'confirmed' && (
                        <span className="confirmation-badge"><CheckCircle size={14} /> Booking Confirmed</span>
                      )}
                    </div>
                    <BookingGallery tourId={booking.tour} mainImage={getImageUrl(booking.tour_image)} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
