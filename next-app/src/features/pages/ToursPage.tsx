"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { toursAPI } from '@/lib/api/client';
import TourCard from '@/components/TourCard';
import { Search } from 'lucide-react';
import type { DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
import type {  Tour  } from "@/features/pages/types";
import { PageHero } from "@/components/PageHero";

export default function ToursPage() {
  const { category } = useParams<Record<string, string>>();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const params: Record<string, string> = {};
    if (category) params.category = category;
    toursAPI.getAll(params)
      .then((res: any) => setTours(res.data.results || res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category]);

  const filtered = tours.filter(t =>
    search ? t.title.toLowerCase().includes(search.toLowerCase()) || t.destination?.toLowerCase().includes(search.toLowerCase()) : true
  );

  const title = !category ? 'All Tours' : category === 'zanzibar' ? 'Zanzibar Tours' : 'Tanzania Safaris';
  const subtitle = !category
    ? 'Explore all our amazing tour packages with Travel.'
    : category === 'zanzibar'
      ? 'Discover the paradise islands of Zanzibar'
      : 'Experience the wild beauty of Tanzania with Travel.';

  return (
    <div className="page tours-page">
      <PageHero
        title={title}
        subtitle={subtitle}
        search={{ value: search, onChange: (value: string) => setSearch(value), placeholder: "Search tours" }}
        chips={["All", "Zanzibar", "Tanzania", "International"]}
      />

      {loading ? (
        <div className="loading">Loading amazing tours...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon"><Search size={24} /></span>
          <p>No tours found matching your search</p>
        </div>
      ) : (
        <div className="tours-grid">
          {filtered.map((tour: Tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      )}
    </div>
  );
}