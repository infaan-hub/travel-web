"use client";

import { useRouter, useParams, usePathname, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { toursAPI } from '@/lib/api/client';
import TourCard from '@/components/TourCard';
import { Search } from '@/components/icons';
import type { DragEvent, FormEvent, KeyboardEvent, MouseEvent } from "react";
import type {  Tour  } from "@/features/pages/types";
import { PageHero } from "@/components/PageHero";
import styles from "@/features/pages/tours-page.module.css";

export default function ToursPage() {
  const router = useRouter();
  const { category } = useParams<Record<string, string>>();
  const [tours, setTours] = useState<Tour[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params: Record<string, string> = {};
    if (category) params.category = category;
    toursAPI.getAll(params)
      .then((res: any) => setTours(res.data.results || res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [category]);

  const title = !category
    ? 'Tours, safaris & experiences'
    : category === 'zanzibar'
      ? 'Zanzibar experiences'
      : category === 'tanzania'
        ? 'Tanzania safaris'
        : 'International experiences';
  const subtitle = !category
    ? 'Browse published experiences from independent tourism companies and choose what suits your trip.'
    : category === 'zanzibar'
      ? 'Find island tours and cultural experiences offered by local providers.'
      : category === 'tanzania'
        ? 'Compare safaris and guided experiences from participating Tanzanian companies.'
        : 'Browse international trips and services published by participating providers.';

  return (
    <div className={`page tours-page ${styles.toursPageRoot}`}>
      <PageHero
        title={title}
        subtitle={subtitle}
        backgroundImageKey="hero"
        patternImageKey="secondary"
        chips={["All", "Zanzibar", "Tanzania", "International"]}
        onChipClick={(chip) => router.push(chip === "All" ? "/tours/" : `/tours/${chip.toLowerCase()}/`)}
      />

      {loading ? (
        <div className={`loading ${styles.toursLoading}`}>Loading amazing tours...</div>
      ) : tours.length === 0 ? (
        <div className={`empty-state ${styles.toursEmpty}`}>
          <span className="empty-icon"><Search size={24} /></span>
          <p>No published experiences match these filters yet. Try another destination or browse companies.</p>
          <Link className="btn btn-secondary" href="/companies/">Browse companies</Link>
        </div>
      ) : (
        <div className="tours-grid">
          {tours.map((tour: Tour) => (
            <TourCard key={tour.id} tour={tour} />
          ))}
        </div>
      )}
    </div>
  );
}
