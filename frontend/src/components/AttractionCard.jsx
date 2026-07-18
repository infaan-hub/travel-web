import { MapPin, Calendar, DollarSign } from 'lucide-react';
import { getImageUrl } from '../utils/imageUrl';

export default function AttractionCard({ attraction }) {
  return (
    <div className="attraction-card">
      <div className="attraction-card-image">
        <img
          src={getImageUrl(attraction.image_url) || ''}
          alt={attraction.name}
          loading="lazy"
        />
        <span className={`attraction-category ${attraction.category}`}>
          {attraction.category?.replace('_', ' ')}
        </span>
      </div>
      <div className="attraction-card-body">
        <h3>{attraction.name}</h3>
        <p><MapPin size={14} /> {attraction.location}</p>
        <p className="attraction-desc">
          {attraction.description ? attraction.description.slice(0, 150) + '...' : ''}
        </p>
        <div className="attraction-info">
          <span><Calendar size={14} /> {attraction.best_time_to_visit || 'All year'}</span>
          {attraction.entry_fee && <span><DollarSign size={14} /> {attraction.entry_fee}</span>}
        </div>
      </div>
    </div>
  );
}
