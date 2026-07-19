import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toursAPI, homeSettingsAPI, reviewsAPI, attractionsAPI } from '../api/axios';
import TourCard from '../components/TourCard';
import { ArrowRight, Star, MapPin, Clock, User, Send, X } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';
import { useAuth } from '../context/AuthContext';

export default function HomePage() {
  const { isAuthenticated } = useAuth();
  const [featuredTours, setFeaturedTours] = useState([]);
  const [allTours, setAllTours] = useState([]);
  const [stats, setStats] = useState({});
  const [homeSettings, setHomeSettings] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [attractions, setAttractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewForm, setReviewForm] = useState({ rating: 5, content: '' });
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewSuccess, setReviewSuccess] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      toursAPI.getAll({ featured: true }),
      toursAPI.getAll({}),
      homeSettingsAPI.get(),
      reviewsAPI.getAll({ status: 'approved' }),
      attractionsAPI.getAll({}),
    ]).then(([featuredRes, allRes, homeRes, reviewsRes, attractionsRes]) => {
      setFeaturedTours(featuredRes.data.results || featuredRes.data);
      const all = allRes.data.results || allRes.data;
      setAllTours(all);
      setHomeSettings(homeRes.data);
      setReviews(reviewsRes.data.results || reviewsRes.data);
      setAttractions(attractionsRes.data.results || attractionsRes.data);
      setStats({
        zanzibar: all.filter(t => t.category === 'zanzibar').length,
        tanzania: all.filter(t => t.category === 'tanzania').length,
        total: all.length,
      });
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!reviewForm.content.trim()) { alert('Review message is required'); return; }
    setReviewSaving(true);
    try {
      await reviewsAPI.create({
        rating: reviewForm.rating,
        content: reviewForm.content.trim(),
      });
      setReviewSuccess('Thank you! Your review has been submitted and will appear after approval.');
      setReviewForm({ rating: 5, content: '' });
      setTimeout(() => setReviewSuccess(''), 5000);
      setShowReviewForm(false);
    } catch { alert('Failed to submit review. Please try again.'); }
    finally { setReviewSaving(false); }
  };

  return (
    <div className="page home-page">
      <section className="hero-section" style={homeSettings?.hero_image_url ? {
        backgroundImage: `url(${getImageUrl(homeSettings.hero_image_url)})`,
      } : {}}>
        <div className="hero-overlay"></div>
        <div className="hero-content">
          <h1>Infaan tours and travel</h1>
          <p>From the pristine beaches of Zanzibar to the wild savannahs of Serengeti, let us craft your perfect African adventure with expert guides, seamless planning, and personalized service every step of the way</p>
        </div>
      </section>

      {!loading && featuredTours.length > 0 && (
        <section className="featured-section">
          <div className="section-header">
            <h2>Featured Tours</h2>
            <p>Hand-picked experiences for unforgettable memories</p>
          </div>
          <div className="tours-grid">
            {featuredTours.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
          <div className="section-footer">
            <button className="btn btn-outline" onClick={() => navigate('/tours')}>
              View All Tours
            </button>
          </div>
        </section>
      )}

      <section className="destinations-section">
        <div className="section-header">
          <h2>Choose Your Adventure</h2>
          <p>Two incredible destinations, one unforgettable country</p>
        </div>
        <div className="destinations-grid">
          <div className="destination-card zanzibar" onClick={() => navigate('/tours/zanzibar')}>
            <div className="destination-image">
              <img
                src={getImageUrl(homeSettings?.zanzibar_image_url || featuredTours.find(t => t.category === 'zanzibar')?.image_url) || ''}
                alt="Zanzibar"
              />
            </div>
            <div className="destination-info">
              <h3>Zanzibar</h3>
              <p>Pristine beaches, spice farms, and rich Swahili culture. Paradise on Earth.</p>
              <span className="destination-link">Explore Zanzibar Tours <ArrowRight size={16} className="inline-icon" /></span>
            </div>
          </div>
          <div className="destination-card tanzania" onClick={() => navigate('/tours/tanzania')}>
            <div className="destination-image">
              <img
                src={getImageUrl(homeSettings?.tanzania_image_url || featuredTours.find(t => t.category === 'tanzania')?.image_url) || ''}
                alt="Tanzania Safari"
              />
            </div>
            <div className="destination-info">
              <h3>Tanzania Safaris</h3>
              <p>Serengeti, Kilimanjaro, Ngorongoro - Africa's greatest wildlife experiences with expert-guided tours and premium service.</p>
              <span className="destination-link">Explore Tanzania Safaris <ArrowRight size={16} className="inline-icon" /></span>
            </div>
          </div>
        </div>
      </section>

      {!loading && allTours.length > 0 && (
        <section className="all-tours-section">
          <div className="section-header">
            <h2>Explore All Tours</h2>
            <p>Discover every tour we offer</p>
          </div>
          <div className="tours-grid">
            {allTours.map((tour) => (
              <TourCard key={tour.id} tour={tour} />
            ))}
          </div>
        </section>
      )}

      {!loading && attractions.length > 0 && (
        <section className="attractions-section">
          <div className="section-header">
            <h2>Top Attractions</h2>
            <p>Discover the most amazing places to visit</p>
          </div>
          <div className="home-attractions-grid">
            {attractions.slice(0, 6).map(att => (
              <div key={att.id} className="home-attraction-card">
                <div className="home-attraction-image">
                  <img src={getImageUrl(att.image_url)} alt={att.name} />
                </div>
                <div className="home-attraction-info">
                  <h3>{att.name}</h3>
                  <span className="home-attraction-location"><MapPin size={14} /> {att.location}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="section-footer">
            <button className="btn btn-outline" onClick={() => navigate('/attractions')}>
              View All Attractions
            </button>
          </div>
        </section>
      )}

      {reviews.length > 0 && (
        <section className="testimonials-section">
          <div className="section-header">
            <h2>What Our Travelers Say About Infaan tours and travel</h2>
            <p>Read reviews from our happy travelers who experienced Africa with us</p>
          </div>
          <div className="testimonials-grid">
            {reviews.slice(0, 6).map(review => (
              <div key={review.id} className="testimonial-card">
                <div className="testimonial-stars">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={16} fill={i < review.rating ? '#f59e0b' : 'none'} color={i < review.rating ? '#f59e0b' : '#d1d5db'} />
                  ))}
                </div>
                <p>"{review.content}"</p>
                <div className="testimonial-author-row">
                  <div className="testimonial-avatar">
                    {review.user_name?.charAt(0).toUpperCase() || '?'}
                  </div>
                  <div>
                    <span className="testimonial-author">{review.user_name}</span>
                    <span className="testimonial-date">{new Date(review.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="section-footer">
            {isAuthenticated ? (
              <button className="btn btn-primary" onClick={() => setShowReviewForm(true)}>
                Write a Review
              </button>
            ) : (
              <button className="btn btn-primary" onClick={() => navigate('/login')}>
                Login to Write a Review
              </button>
            )}
          </div>
        </section>
      )}

      <section className="stats-section">
        <div className="stat-item">
          <span className="stat-number">{stats.total || '50+'}</span>
          <span className="stat-label">Amazing Tours</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.zanzibar || '15+'}</span>
          <span className="stat-label">Zanzibar Tours</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">{stats.tanzania || '20+'}</span>
          <span className="stat-label">Tanzania Safaris</span>
        </div>
        <div className="stat-item">
          <span className="stat-number">1000+</span>
          <span className="stat-label">Happy Travelers</span>
        </div>
      </section>

      {showReviewForm && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowReviewForm(false); }}>
          <div className="modal-content review-form-modal">
            <div className="modal-header">
              <h3>Share Your Experience</h3>
              <button className="modal-close" onClick={() => setShowReviewForm(false)}><X size={18} /></button>
            </div>
            {reviewSuccess && <div className="alert alert-success">{reviewSuccess}</div>}
            <form onSubmit={handleReviewSubmit} className="review-form">
              <div className="form-group">
                <label>Rating</label>
                <div className="star-rating-input">
                  {[1, 2, 3, 4, 5].map(s => (
                    <button key={s} type="button" className={`star-btn ${s <= reviewForm.rating ? 'active' : ''}`}
                      onClick={() => setReviewForm({ ...reviewForm, rating: s })}>
                      <Star size={24} fill={s <= reviewForm.rating ? '#f59e0b' : 'none'}
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

      <section className="cta-section">
        <div className="cta-content">
          <h2>Ready for Your African Adventure with Infaan tours and travel?</h2>
          <p>Book your dream tour today and create memories that last a lifetime. Our travel experts are here to help you plan every detail.</p>
          <button className="btn btn-primary btn-large" onClick={() => navigate('/tours')}>
            Start Planning Your Trip
          </button>
        </div>
      </section>
    </div>
  );
}
