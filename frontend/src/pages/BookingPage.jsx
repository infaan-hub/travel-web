import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api, { toursAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { MapPin, Clock, Mail, MessageSquare, CheckCircle, Navigation } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function BookingPage() {
  const { tourId } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(!!tourId);
  const [sendMethod, setSendMethod] = useState('email');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [distance, setDistance] = useState(null);
  const [estimatedTime, setEstimatedTime] = useState(null);
  const [mapsUrl, setMapsUrl] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    address: '',
    travelers: 1,
    children: 0,
    travel_date: '',
    notes: '',
  });

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: tourId ? `/booking/${tourId}` : '/booking' } });
      return;
    }
    if (user) {
      setForm(prev => ({
        ...prev,
        full_name: user.username || '',
        email: user.email || '',
      }));
    }
    if (tourId) {
      toursAPI.getById(tourId)
        .then((res) => setTour(res.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
          setUserLocation(loc);
        },
        () => console.log('Geolocation not available'),
        { timeout: 10000 }
      );
    }
  }, [tourId, user, isAuthenticated, navigate]);

  useEffect(() => {
    if (userLocation && tour?.destination_lat && tour?.destination_lng) {
      const dist = haversineDistance(userLocation.lat, userLocation.lng, tour.destination_lat, tour.destination_lng);
      setDistance(Math.round(dist * 10) / 10);
      const time = Math.round(dist / 50 * 60);
      setEstimatedTime(time);
      const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${tour.destination_lat},${tour.destination_lng}`;
      setMapsUrl(url);
    }
  }, [userLocation, tour]);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const createBooking = async () => {
    if (tour) {
      const bookingData = {
        ...form,
        tour: tour.id,
        user_lat: userLocation?.lat || null,
        user_lng: userLocation?.lng || null,
        distance_km: distance || null,
        estimated_time_mins: estimatedTime || null,
        google_maps_url: mapsUrl || '',
      };
      await api.post('/bookings/', bookingData);
    }
  };

  const sendEmail = async () => {
    const res = await api.post('/send-email/', {
      ...form,
      tour: tour ? tour.title : 'Custom Tour Inquiry',
      destination: tour ? tour.destination : '',
      children: Number(form.children) || 0,
      recipient_email: 'infaanhameed@gmail.com',
    });
    return res.data;
  };

  const sendWhatsApp = async () => {
    const res = await api.post('/send-whatsapp/', {
      ...form,
      tour: tour ? tour.title : 'Custom Tour Inquiry',
      whatsapp_number: '255711252758',
    });
    return res.data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    let bookingCreated = false;
    try {
      await createBooking();
      bookingCreated = true;
      if (sendMethod === 'email') {
        await sendEmail();
      } else {
        const waRes = await sendWhatsApp();
        window.open(waRes.whatsapp_url, '_blank');
      }
      setSuccess(true);
      setTimeout(() => navigate('/bookings'), 3000);
    } catch (err) {
      const msg = err.response?.data?.message || err.message || '';
      if (bookingCreated) {
        const userMsg = msg
          ? `Booking saved! But ${msg.toLowerCase()}. We will contact you soon.`
          : 'Booking saved! Email notification failed. We will contact you soon.';
        alert(userMsg);
        navigate('/bookings');
      } else {
        alert(msg || 'Failed to process booking. Please try again.');
      }
    } finally {
      setSending(false);
    }
  };

  if (!isAuthenticated) return null;
  if (loading) return <div className="page"><div className="loading">Loading tour details...</div></div>;

  return (
    <div className="page booking-page">
      <div className="page-header">
        <h1>{tour ? `Book: ${tour.title}` : 'Book a Tour'}</h1>
        <p>Fill in your details below and we'll confirm your reservation</p>
      </div>

      {success ? (
        <div className="booking-success-full">
          <span className="success-icon"><CheckCircle size={32} /></span>
          <h2>Booking Submitted Successfully!</h2>
          <p>
            {sendMethod === 'email'
              ? 'Your booking details have been sent to your email and our team at infaanhameed@gmail.com. We will contact you within 24 hours.'
              : 'WhatsApp chat has been opened with your booking details. Our team will respond shortly.'}
          </p>
          <div className="success-actions">
            <button className="btn btn-primary" onClick={() => navigate('/bookings')}>
              View My Bookings
            </button>
            <button className="btn btn-outline" onClick={() => navigate('/')}>
              Back to Home
            </button>
          </div>
        </div>
      ) : (
        <div className="booking-form-wrapper">
          <div className="booking-form-container">
            {tour && (
              <div className="booking-tour-summary">
                <img src={getImageUrl(tour.image_url) || ''} alt={tour.title} />
                <div className="booking-tour-info">
                  <h3>{tour.title}</h3>
                  <span className="tour-destination"><MapPin size={16} /> {tour.destination}</span>
                  <span className="tour-duration"><Clock size={16} /> {tour.duration}</span>
                  <span className="tour-price-tag">${tour.price} <small>/ person</small></span>
                  {distance && (
                    <div className="booking-distance-info">
                      <span><Navigation size={14} /> Distance: ~{distance} km</span>
                      {estimatedTime && <span>Estimated time: ~{Math.floor(estimatedTime / 60)}h {estimatedTime % 60}m</span>}
                    </div>
                  )}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="booking-form-detailed">
              <h2>Personal Information</h2>
              <div className="form-row">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input type="text" name="full_name" value={form.full_name} onChange={handleChange} required placeholder="Your full name" />
                </div>
                <div className="form-group">
                  <label>Email *</label>
                  <input type="email" name="email" value={form.email} onChange={handleChange} required placeholder="your@email.com" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Phone *</label>
                  <input type="tel" name="phone" value={form.phone} onChange={handleChange} required placeholder="+255 7XX XXX XXX" />
                </div>
                <div className="form-group">
                  <label>Address</label>
                  <input type="text" name="address" value={form.address} onChange={handleChange} placeholder="Your address" />
                </div>
              </div>

              <h2>Trip Details</h2>
              <div className="form-row">
                <div className="form-group">
                  <label>Number of Adults *</label>
                  <input type="number" name="travelers" min="1" max="50" value={form.travelers} onChange={handleChange} required />
                </div>
                <div className="form-group">
                  <label>Number of Children</label>
                  <input type="number" name="children" min="0" max="20" value={form.children} onChange={handleChange} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Travel Date *</label>
                  <input type="date" name="travel_date" value={form.travel_date} onChange={handleChange} required />
                </div>
              </div>
              <div className="form-group">
                <label>Special Requests / Notes</label>
                <textarea name="notes" value={form.notes} onChange={handleChange} rows="4" placeholder="Hotel preferences, dietary requirements, special occasions..." />
              </div>

              <h2>Confirmation Method</h2>
              <p className="send-method-label">How would you like to receive your booking confirmation?</p>
              <div className="send-method-options">
                <label className={`send-method-card ${sendMethod === 'email' ? 'selected' : ''}`}>
                  <input type="radio" name="sendMethod" value="email" checked={sendMethod === 'email'} onChange={() => setSendMethod('email')} />
                  <span className="method-icon"><Mail size={24} /></span>
                  <span className="method-label">Send via Email</span>
                  <span className="method-desc">Receive full details at your email and infaanhameed@gmail.com</span>
                </label>
                <label className={`send-method-card ${sendMethod === 'whatsapp' ? 'selected' : ''}`}>
                  <input type="radio" name="sendMethod" value="whatsapp" checked={sendMethod === 'whatsapp'} onChange={() => setSendMethod('whatsapp')} />
                  <span className="method-icon"><MessageSquare size={24} /></span>
                  <span className="method-label">Send via WhatsApp</span>
                  <span className="method-desc">Open WhatsApp chat with your booking details to +255711252758</span>
                </label>
              </div>

              <button type="submit" className="btn btn-primary btn-block btn-large" disabled={sending}>
                {sending ? 'Processing...' : `Submit Booking via ${sendMethod === 'email' ? 'Email' : 'WhatsApp'}`}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
