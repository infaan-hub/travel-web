"use client";

import { useState, useEffect } from 'react';
import { attractionsAPI } from '@/lib/api/client';
import AttractionCard from '@/components/AttractionCard';
import { Map } from 'lucide-react';
import type { ChangeEvent, DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
import type {  Attraction  } from "@/features/pages/types";
import { PageHero } from "@/components/PageHero";

export default function AttractionsPage() {
  const [attractions, setAttractions] = useState<Attraction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [region, setRegion] = useState('all');

  useEffect(() => {
    const params: Record<string, string> = {};
    if (filter !== 'all') params.category = filter;
    if (region !== 'all') params.region = region;
    attractionsAPI.getAll(params)
      .then((res: any) => setAttractions((res.data.results || res.data) as Attraction[]))
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
      <PageHero
        title="Attractions"
        subtitle="Beaches, caves, markets and wildlife — the places travellers keep coming back to."
        chips={["All", "National Parks", "Beaches", "Mountains", "Cultural"]}
        onChipClick={(chip: string) => setFilter(chip === "All" ? "all" : chip.toLowerCase())}
      />

      <div className="filters-bar">
        <div className="filter-group">
          <label>Category</label>
          <select value={filter} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setFilter(e.target.value)}>
            {categories.map((c: any) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Region</label>
          <select value={region} onChange={(e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setRegion(e.target.value)}>
            {regions.map((r: any) => <option key={r.value} value={r.value}>{r.label}</option>)}
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
          {attractions.map((att: Attraction) => (
            <AttractionCard key={att.id} attraction={att} />
          ))}
        </div>
      )}
    </div>
  );
}