import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { toursAPI } from '../api/axios';
import TourCard from '../components/TourCard';
import { Search } from 'lucide-react';

export default function ToursPage() {
  const { category } = useParams();
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (category) params.category = category;
    toursAPI.getAll(params)
      .then((res) => setTours(res.data.results || res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category]);

  const filtered = tours.filter(t =>
    search ? t.title.toLowerCase().includes(search.toLowerCase()) || t.destination?.toLowerCase().includes(search.toLowerCase()) : true
  );

  const title = !category ? 'All Tours' : category === 'zanzibar' ? 'Zanzibar Tours' : 'Tanzania Safaris';
  const subtitle = !category
    ? 'Explore all our amazing tour packages'
    : category === 'zanzibar'
      ? 'Discover the paradise islands of Zanzibar'
      : 'Experience the wild beauty of Tanzania';

  return (
    <div className="page tours-page">
      <div className="page-header">
        <h1>{title}</h1>
        <p>{subtitle}</p>
        <div className="search-bar">
          <input
            type="text"
            placeholder="Search tours..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="search-icon"><Search size={18} /></span>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading amazing tours...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon"><Search size={24} /></span>
          <p>No tours found matching your search</p>
        </div>
      ) : (
        <div className="tours-grid">
          {filtered.map((tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      )}
    </div>
  );
}
