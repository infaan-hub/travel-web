import { useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { workspacesAPI } from '../api/axios';
import { ArrowLeft, Mail, Check, Globe, Hotel, Truck, BedDouble, User, Smartphone, Copy } from 'lucide-react';

export default function AdminPricingPage() {
  const { isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();
  const state = location.state;

  const [sending, setSending] = useState(false);

  if (!isAuthenticated || !isAdmin) return null;
  if (!state) {
    return (
      <div className="page admin-page">
        <div className="page-header">
          <h1>Pricing</h1>
        </div>
        <div className="empty-state">
          <p>No pricing data available. Please plan the tour first.</p>
          <button className="btn btn-primary" onClick={() => navigate('/admin/work-space')}>
            Go to Workspace
          </button>
        </div>
      </div>
    );
  }

  const { tourist, selectedTours, selectedHotel, selectedRooms, selectedTravelDriver, selectedTravelVehicle, notes } = state;

  const toursPrice = selectedTours.reduce((sum, t) => sum + (parseFloat(t.price) || 0), 0);
  const roomsPrice = selectedRooms.reduce((sum, r) => sum + (parseFloat(r.price) || 0), 0);
  const finalTotal = toursPrice + roomsPrice;

  const generateMessage = () => {
    const tourList = selectedTours.map(t => `• ${t.title} - $${t.price}`).join('\n');
    const roomList = selectedRooms.map(r => `• ${r.name} - $${r.price}/night`).join('\n');

    return `*Infaan Tours & Travel - Tour Plan*\n\n` +
      `Dear ${tourist?.username || 'Guest'},\n\n` +
      `Here is your personalized tour itinerary:\n\n` +
      `*Selected Tours:*\n${tourList || 'N/A'}\n\n` +
      `*Hotel:* ${selectedHotel?.name || 'N/A'} (${selectedHotel?.location || ''})\n` +
      `*Rooms:*\n${roomList || 'N/A'}\n\n` +
      `*Travel Driver:* ${selectedTravelDriver?.name || 'N/A'} (${selectedTravelDriver?.phone || ''})\n` +
      `*Vehicle:* ${selectedTravelVehicle?.car_name || 'N/A'} - ${selectedTravelVehicle?.plate_number || ''}\n\n` +
      `*Total Package Price: $${finalTotal}*\n\n` +
      `${notes ? `*Notes:*\n${notes}\n\n` : ''}` +
      `Thank you for choosing Infaan Tours & Travel!\n` +
      `We look forward to making your trip unforgettable.`;
  };

  const handleSendWhatsApp = async () => {
    setSending(true);
    try {
      const message = encodeURIComponent(generateMessage());
      const phone = tourist?.phone || selectedTravelDriver?.phone || tourist?.email;
      if (phone) {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        window.open(`https://wa.me/${cleanPhone}?text=${message}`, '_blank');
      } else {
        alert('No phone number available for this tourist.');
      }
    } finally {
      setSending(false);
    }
  };

  const handleSendEmail = () => {
    const subject = encodeURIComponent('Your Tour Plan - Infaan Tours & Travel');
    const body = encodeURIComponent(generateMessage());
    const email = tourist?.email;
    if (email) {
      window.open(`mailto:${email}?subject=${subject}&body=${body}`, '_blank');
    } else {
      alert('No email available for this tourist.');
    }
  };

  const handleCopyMessage = () => {
    navigator.clipboard.writeText(generateMessage());
    alert('Message copied to clipboard!');
  };

  const handleApproveAndFinish = async () => {
    try {
      if (id && id !== 'new') {
        await workspacesAPI.update(id, {
          status: 'approved',
          total_price: finalTotal,
          message_sent: true
        });
      }
      navigate(`/view-workspace/${id}`);
    } catch (err) {
      alert('Failed to approve workspace');
    }
  };

  return (
    <div className="page admin-page">
      <div className="page-header">
        <div className="page-header-row">
          <button className="btn btn-outline" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Back
          </button>
          <div>
            <h1>Pricing & Send</h1>
            <p>Review total price and send the tour plan to {tourist?.username}</p>
          </div>
        </div>
      </div>

      <div className="pricing-content">
        <div className="pricing-details-card">
          <h3>Tourist Information</h3>
          <div className="pricing-info-row">
            <User size={16} />
            <span>{tourist?.username || 'N/A'}</span>
          </div>
          <div className="pricing-info-row">
            <Mail size={16} />
            <span>{tourist?.email || 'N/A'}</span>
          </div>
        </div>

        <div className="pricing-details-card">
          <h3>Selected Tours</h3>
          {selectedTours.length === 0 ? (
            <p className="empty-text">No tours selected</p>
          ) : (
            <div className="pricing-items">
              {selectedTours.map((tour, i) => (
                <div key={i} className="pricing-item">
                  <Globe size={16} />
                  <span className="pricing-item-name">{tour.title || `Tour #${tour.id || tour}`}</span>
                  <span className="pricing-item-price">${tour.price || 0}</span>
                </div>
              ))}
              <div className="pricing-item total">
                <span>Tours Subtotal</span>
                <span>${toursPrice}</span>
              </div>
            </div>
          )}
        </div>

        <div className="pricing-details-card">
          <h3>Hotel & Rooms</h3>
          {selectedHotel ? (
            <>
              <div className="pricing-item">
                <Hotel size={16} />
                <span className="pricing-item-name">{selectedHotel.name}</span>
                <span className="pricing-item-location">{selectedHotel.location}</span>
              </div>
              {selectedRooms.map((room, i) => (
                <div key={i} className="pricing-item">
                  <BedDouble size={16} />
                  <span className="pricing-item-name">{room.name}</span>
                  <span className="pricing-item-price">${room.price}/night</span>
                </div>
              ))}
              <div className="pricing-item total">
                <span>Rooms Subtotal</span>
                <span>${roomsPrice}</span>
              </div>
            </>
          ) : (
            <p className="empty-text">No hotel selected</p>
          )}
        </div>

        <div className="pricing-details-card">
          <h3>Travel Assignment</h3>
          {selectedTravelDriver ? (
            <div className="pricing-item">
              <User size={16} />
              <span className="pricing-item-name">Driver: {selectedTravelDriver.name}</span>
              <span>{selectedTravelDriver.phone}</span>
            </div>
          ) : <p className="empty-text">No driver assigned</p>}
          {selectedTravelVehicle ? (
            <div className="pricing-item">
              <Truck size={16} />
              <span className="pricing-item-name">{selectedTravelVehicle.car_name}</span>
              <span>{selectedTravelVehicle.plate_number}</span>
            </div>
          ) : <p className="empty-text">No vehicle assigned</p>}
        </div>

        {notes && (
          <div className="pricing-details-card">
            <h3>Notes</h3>
            <p style={{ whiteSpace: 'pre-wrap' }}>{notes}</p>
          </div>
        )}

        <div className="pricing-total-card">
          <div className="pricing-total-row">
            <span>Tours</span>
            <span>${toursPrice}</span>
          </div>
          <div className="pricing-total-row">
            <span>Rooms</span>
            <span>${roomsPrice}</span>
          </div>
          <div className="pricing-total-row grand-total">
            <span>Total Package Price</span>
            <span>${finalTotal}</span>
          </div>
        </div>

        <div className="pricing-message-card">
          <h3>Generated Message</h3>
          <div className="pricing-message-box">
            <pre>{generateMessage()}</pre>
          </div>
          <div className="pricing-send-actions">
            <button className="btn btn-primary" onClick={handleSendWhatsApp} disabled={sending}>
              <Smartphone size={16} /> Send via WhatsApp
            </button>
            <button className="btn btn-primary" onClick={handleSendEmail} disabled={sending}>
              <Mail size={16} /> Send via Email
            </button>
            <button className="btn btn-outline" onClick={handleCopyMessage}>
              <Copy size={16} /> Copy Message
            </button>
          </div>
        </div>

        <div className="pricing-submit-section">
          <button className="btn btn-primary btn-large btn-block" onClick={handleApproveAndFinish}>
            <Check size={18} /> Approve & View Workspace
          </button>
        </div>
      </div>
    </div>
  );
}
