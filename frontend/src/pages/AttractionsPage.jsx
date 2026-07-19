import { useState, useEffect } from 'react';
import { attractionsAPI } from '../api/axios';
import AttractionCard from '../components/AttractionCard';
import { Map } from 'lucide-react';

export default function AttractionsPage() {
  const [attractions, setAttractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [region, setRegion] = useState('all');

  useEffect(() => {
    setLoading(true);
    const params = {};
    if (filter !== 'all') params.category = filter;
    if (region !== 'all') params.region = region;
    attractionsAPI.getAll(params)
      .then((res) => setAttractions(res.data.results || res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filter, region]);

  const categories = [
    { value: 'all', label: 'All' },
    { value: 'national_park', label: 'National Parks' },
    { value: 'beach', label: 'Beaches' },
    { value: 'mountain', label: 'Mountains' },
    { value: 'cultural', label: 'Cultural' },
  ];

  const regions = [
    { value: 'all', label: 'All Regions' },
    { value: 'Zanzibar', label: 'Zanzibar' },
    { value: 'Serengeti', label: 'Serengeti' },
    { value: 'Ngorongoro', label: 'Ngorongoro' },
    { value: 'Kilimanjaro', label: 'Kilimanjaro' },
    { value: 'Arusha', label: 'Arusha' },
    { value: 'Selous', label: 'Selous' },
  ];

  return (
    <div className="page attractions-page">
      <div className="page-header">
        <h1>Attractions</h1>
        <p>Discover the amazing attractions of Zanzibar and Tanzania with Infaan tours and travel</p>
      </div>

      <div className="filters-bar">
        <div className="filter-group">
          <label>Category</label>
          <select value={filter} onChange={(e) => setFilter(e.target.value)}>
            {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Region</label>
          <select value={region} onChange={(e) => setRegion(e.target.value)}>
            {regions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading">Discovering attractions...</div>
      ) : attractions.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon"><Map size={24} /></span>
          <p>No attractions found for this filter</p>
        </div>
      ) : (
        <div className="attractions-grid">
          {attractions.map((att) => (
            <AttractionCard key={att.id} attraction={att} />
          ))}
        </div>
      )}
    </div>
  );
}
