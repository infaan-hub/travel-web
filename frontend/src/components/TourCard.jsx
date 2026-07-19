import { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import useEmblaCarousel from 'embla-carousel-react';
import Autoplay from 'embla-carousel-autoplay';
import { Star, Clock, MapPin } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

export default function TourCard({ tour }) {
  const navigate = useNavigate();
  const autoplay = useRef(Autoplay({ delay: 5000, stopOnInteraction: false }));

  const images = [
    getImageUrl(tour.main_image_url || tour.image_url),
    ...(tour.gallery_image_urls || []).map(url => getImageUrl(url)),
    ...(tour.image2_url ? [getImageUrl(tour.image2_url)] : []),
    ...(tour.image3_url ? [getImageUrl(tour.image3_url)] : []),
  ].filter(Boolean);

  const uniqueImages = [...new Set(images)];

  const [emblaRef] = useEmblaCarousel({ loop: uniqueImages.length > 1 }, [autoplay.current]);

  return (
    <div className="tour-card" onClick={() => navigate(`/tour/${tour.id}`)}>
      <div className="tour-card-image">
        <div className="embla" ref={emblaRef}>
          <div className="embla__container">
            {uniqueImages.map((img, i) => (
              <div key={i} className="embla__slide">
                <img src={img} alt={tour.title} loading="lazy" className="embla__slide__img" />
              </div>
            ))}
          </div>
        </div>
        <span className={`tour-category ${tour.category}`}>
          {tour.category === 'zanzibar' ? 'Zanzibar' : tour.category === 'tanzania' ? 'Tanzania Safari' : 'International'}
        </span>

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
