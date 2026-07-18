import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toursAPI, reviewsAPI } from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { ArrowLeft, MapPin, Clock, Star, Check, XCircle, ChevronLeft, ChevronRight, X, Send, User } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

export default function TourDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const [tour, setTour] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allImages, setAllImages] = useState([]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showLightbox, setShowLightbox] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, content: '' });
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [tourReviews, setTourReviews] = useState([]);

  useEffect(() => {
    loadTour();
  }, [id]);

  const loadTour = () => {
    setLoading(true);
    Promise.all([
      toursAPI.getById(id),
      reviewsAPI.getTourReviews(id),
    ]).then(([tourRes, revRes]) => {
      const t = tourRes.data;
      setTour(t);
      setTourReviews(revRes.data.results || revRes.data);
      const images = [];
      if (t.main_image_url) images.push(getImageUrl(t.main_image_url));
      (t.gallery_image_urls || []).forEach(url => {
        const fullUrl = getImageUrl(url);
        if (!images.includes(fullUrl)) images.push(fullUrl);
      });
      setAllImages(images);
    }).catch(console.error).finally(() => setLoading(false));
  };

  const handleBookNow = () => {
    if (isAuthenticated) {
      navigate(`/booking/${tour.id}`);
    } else {
      navigate('/login', { state: { from: `/booking/${tour.id}` } });
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewSaving(true);
    setReviewError('');
    setReviewSuccess('');
    try {
      await reviewsAPI.createTourReview(id, {
        rating: reviewForm.rating,
        content: reviewForm.content,
      });
      setReviewSuccess('Your review has been submitted and is pending approval.');
      setReviewForm({ rating: 5, content: '' });
      setShowReviewForm(false);
      setTimeout(() => setReviewSuccess(''), 4000);
    } catch (err) {
      const msg = err.response?.data?.error || 'Failed to submit review';
      setReviewError(msg);
      if (msg.includes('already reviewed')) {
        setReviewSuccess('');
      }
    } finally {
      setReviewSaving(false);
    }
  };

  if (loading) return <div className="page"><div className="loading">Loading tour details...</div></div>;
  if (!tour) return <div className="page"><div className="empty-state"><p>Tour not found</p></div></div>;

  const openLightbox = (index) => { setCurrentImageIndex(index); setShowLightbox(true); };

  const renderStars = (rating, size = 14) => (
    <span className="review-rating">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} size={size} fill={s <= rating ? '#f59e0b' : 'none'} color={s <= rating ? '#f59e0b' : '#d1d5db'} />
      ))}
    </span>
  );

  return (
    <div className="page tour-detail-page">
      <button className="btn btn-back" onClick={() => navigate(-1)}><ArrowLeft size={18} /> Back</button>

      <div className="tour-detail-hero">
        {allImages.length > 0 ? (
          <>
            <img src={allImages[0]} alt={tour.title} onClick={() => openLightbox(0)} style={{ cursor: 'pointer' }} />
            {allImages.length > 1 && (
              <div className="gallery-badge" onClick={() => openLightbox(0)}>
                View {allImages.length} Photos
              </div>
            )}
          </>
        ) : (
          <div className="tour-detail-hero-placeholder"></div>
        )}
        <div className="tour-detail-overlay">
          <span className={`tour-category ${tour.category}`}>
            {tour.category === 'zanzibar' ? 'Zanzibar' : tour.category === 'tanzania' ? 'Tanzania' : 'International'}
          </span>
          <h1>{tour.title}</h1>
          <p><MapPin size={16} /> {tour.destination} | <Clock size={16} /> {tour.duration} | ${tour.price}/person</p>
        </div>
      </div>

      {allImages.length > 1 && (
        <div className="tour-gallery-thumbs">
          {allImages.map((img, i) => (
            <img key={i} src={img} alt=""
              className={i === currentImageIndex ? 'active' : ''}
              onClick={() => openLightbox(i)} />
          ))}
        </div>
      )}

      {showLightbox && (
        <div className="gallery-modal" onClick={() => setShowLightbox(false)}>
          <button className="gallery-close-btn" onClick={() => setShowLightbox(false)}><X size={24} /></button>
          <button className="gallery-nav gallery-prev" onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => (i - 1 + allImages.length) % allImages.length); }}><ChevronLeft size={24} /></button>
          <img src={allImages[currentImageIndex]} alt="" onClick={(e) => e.stopPropagation()} />
          <button className="gallery-nav gallery-next" onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(i => (i + 1) % allImages.length); }}><ChevronRight size={24} /></button>
          <div className="gallery-counter">{currentImageIndex + 1} / {allImages.length}</div>
        </div>
      )}

      <div className="tour-detail-content">
        <div className="tour-detail-main">
          <section className="tour-description">
            <h2>About This Tour</h2>
            <p>{tour.description}</p>
          </section>

          {tour.itinerary && tour.itinerary.length > 0 && (
            <section className="tour-itinerary">
              <h2>Itinerary</h2>
              <div className="itinerary-list">
                {tour.itinerary.map((item) => (
                  <div key={item.id} className="itinerary-item">
                    <div className="itinerary-day">Day {item.day}</div>
                    <div className="itinerary-details">
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(() => {
            const items = Array.isArray(tour.included_items || tour.includes)
              ? (tour.included_items || tour.includes)
              : typeof tour.includes === 'string' && tour.includes
                ? tour.includes.split(',').map(i => i.trim()).filter(Boolean)
                : [];
            return items.length > 0 ? (
              <section className="tour-includes">
                <h2>What's Included</h2>
                <div className="includes-list">
                  {items.map((item, i) => (
                    <span key={i} className="include-item"><Check size={16} /> {item}</span>
                  ))}
                </div>
              </section>
            ) : null;
          })()}

          {(() => {
            const items = Array.isArray(tour.excluded_items || tour.excludes)
              ? (tour.excluded_items || tour.excludes)
              : typeof tour.excludes === 'string' && tour.excludes
                ? tour.excludes.split(',').map(i => i.trim()).filter(Boolean)
                : [];
            return items.length > 0 ? (
              <section className="tour-excludes">
                <h2>What's Excluded</h2>
                <div className="excludes-list">
                  {items.map((item, i) => (
                    <span key={i} className="exclude-item"><XCircle size={16} /> {item}</span>
                  ))}
                </div>
              </section>
            ) : null;
          })()}

          <section className="tour-reviews">
            <div className="tour-reviews-header">
              <h2>Reviews ({tourReviews.length})</h2>
              {isAuthenticated && (
                <button className="btn btn-primary" onClick={() => setShowReviewForm(true)}>
                  <Star size={16} /> Write a Review
                </button>
              )}
            </div>

            {reviewSuccess && <div className="alert alert-success">{reviewSuccess}</div>}
            {reviewError && <div className="alert alert-error">{reviewError}</div>}

            {showReviewForm && (
              <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowReviewForm(false); }}>
                <div className="modal-content review-form-modal">
                  <div className="modal-header">
                    <h3>Rate This Tour</h3>
                    <button className="modal-close" onClick={() => setShowReviewForm(false)}><X size={18} /></button>
                  </div>
                  <form onSubmit={handleReviewSubmit} className="review-form">
                    <div className="form-group">
                      <label>Your Rating</label>
                      <div className="star-rating-input">
                        {[1, 2, 3, 4, 5].map(s => (
                          <button key={s} type="button" className={`star-btn ${s <= reviewForm.rating ? 'active' : ''}`}
                            onClick={() => setReviewForm({ ...reviewForm, rating: s })}>
                            <Star size={28} fill={s <= reviewForm.rating ? '#f59e0b' : 'none'}
                              color={s <= reviewForm.rating ? '#f59e0b' : '#d1d5db'} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="form-group">
                      <label>Your Review</label>
                      <textarea placeholder="Share your experience..." rows={4} value={reviewForm.content}
                        onChange={e => setReviewForm({ ...reviewForm, content: e.target.value })} required />
                    </div>
                    <button type="submit" className="btn btn-primary btn-block" disabled={reviewSaving}>
                      <Send size={16} /> {reviewSaving ? 'Submitting...' : 'Submit Review'}
                    </button>
                  </form>
                </div>
              </div>
            )}

            {tourReviews.length > 0 ? (
              <div className="reviews-list">
                {tourReviews.map((review) => (
                  <div key={review.id} className="review-card">
                    <div className="review-header">
                      <div className="review-user-avatar">
                        {review.user_name?.charAt(0).toUpperCase() || '?'}
                      </div>
                      <div className="review-user-info">
                        <strong>{review.user_name || 'Anonymous'}</strong>
                        {renderStars(review.rating)}
                      </div>
                    </div>
                    <p>{review.content}</p>
                    <span className="review-date">{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="no-reviews">No reviews yet. Be the first to review!</p>
            )}
          </section>
        </div>

        <aside className="tour-detail-sidebar">
          <div className="booking-card">
            <div className="booking-price">
              <strong>${tour.price}</strong>
              <span>per person</span>
            </div>

            {tour.average_rating ? (
              <div className="booking-rating">
                {renderStars(Math.round(tour.average_rating), 16)}
                <span> {tour.average_rating.toFixed(1)} ({tour.review_count || 0})</span>
              </div>
            ) : (
              <div className="booking-rating" style={{ color: 'var(--text-light)', fontWeight: 400 }}>
                No ratings yet
              </div>
            )}

            <div className="tour-quick-info">
              <span><Clock size={16} /> {tour.duration}</span>
              <span><MapPin size={16} /> {tour.destination}</span>
            </div>

            <button className="btn btn-primary btn-block btn-large" onClick={handleBookNow}>
              {isAuthenticated ? 'Book This Tour Now' : 'Login to Book'}
            </button>
            <p className="booking-note">
              {isAuthenticated
                ? 'Click above to fill your booking details'
                : 'Please login or register to book this amazing tour'}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
