import { useNavigate } from 'react-router-dom';
import { Star, Clock, MapPin } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

export default function TourCard({ tour }) {
  const navigate = useNavigate();

  return (
    <div className="tour-card" onClick={() => navigate(`/tour/${tour.id}`)}>
      <div className="tour-card-image">
        <img
          src={getImageUrl(tour.main_image_url || tour.image_url) || ''}
          alt={tour.title}
          loading="lazy"
        />
        <span className={`tour-category ${tour.category}`}>
          {tour.category === 'zanzibar' ? 'Zanzibar' : tour.category === 'tanzania' ? 'Tanzania' : 'International'}
        </span>
        {tour.featured && <span className="tour-featured">Featured</span>}
      </div>
      <div className="tour-card-body">
        <h3>{tour.title}</h3>
        <p>{tour.short_description || (tour.description ? tour.description.slice(0, 120) + '...' : '')}</p>
        <div className="tour-card-meta">
          {tour.average_rating ? (
            <span className="tour-rating">
              <span className="stars-display">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} size={12} fill={s <= Math.round(tour.average_rating) ? '#f59e0b' : 'none'}
                    color={s <= Math.round(tour.average_rating) ? '#f59e0b' : '#d1d5db'} />
                ))}
              </span>
              {tour.average_rating.toFixed(1)} ({tour.review_count || 0})
            </span>
          ) : (
            <span className="tour-rating">
              <span className="stars-display">
                {[1, 2, 3, 4, 5].map(s => (
                  <Star key={s} size={12} fill="none" color="#d1d5db" />
                ))}
              </span>
              No reviews
            </span>
          )}
          <span className="tour-duration"><Clock size={14} /> {tour.duration}</span>
          <span className="tour-destination"><MapPin size={14} /> {tour.destination}</span>
        </div>
        <div className="tour-card-footer">
          <span className="tour-price">
            From <strong>${tour.price}</strong>
          </span>
          <span className="tour-per-person">per person</span>
        </div>
      </div>
    </div>
  );
}
