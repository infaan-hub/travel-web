"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Star } from "@/components/icons";
import { getImageUrl } from "@/lib/utils/image-url";
import "./DestinationCard.css";

type Tour = {
  id: number;
  title: string;
  description?: string;
  short_description?: string;
  price: string | number;
  duration: string;
  destination: string;
  category: string;
  average_rating?: number | null;
  review_count?: number;
  main_image_url?: string | null;
  image_url?: string | null;
  image2_url?: string | null;
  image3_url?: string | null;
  gallery_image_urls?: string[];
  company_name?: string | null;
  company_public_path?: string | null;
};

export default function TourCard({ tour }: { tour: Tour }) {
  const images = [
    getImageUrl(tour.main_image_url || tour.image_url),
    ...(tour.gallery_image_urls || []).map((url) => getImageUrl(url)),
    ...(tour.image2_url ? [getImageUrl(tour.image2_url)] : []),
    ...(tour.image3_url ? [getImageUrl(tour.image3_url)] : []),
  ].filter(Boolean);

  const uniqueImages = [...new Set(images)];

  const detailHref = `/tour/${tour.id}/`;
  const router = useRouter();
  const [liked, setLiked] = useState(false);

  const rating =
    tour.average_rating != null ? Number(tour.average_rating).toFixed(1) : null;
  const reviews = tour.review_count || 0;

  return (
    <article className="dc dc--linked">
      {uniqueImages[0] ? (
        <Image
          className="dc__img"
          src={uniqueImages[0]}
          alt={`${tour.title}, ${tour.destination}`}
          fill
          sizes="(max-width: 768px) 100vw, 300px"
          style={{ objectFit: "cover" }}
        />
      ) : (
        <div className="dc__img" style={{ display: "grid", placeItems: "center" }}>
          <span>Experience</span>
        </div>
      )}
      <div className="dc__shade" />

      <Link
        href={detailHref}
        className="dc__cover-link"
        aria-label={`View tour: ${tour.title}`}
      />

      <button
        className="dc__heart"
        aria-label={liked ? "Remove from favourites" : "Add to favourites"}
        aria-pressed={liked}
        onClick={() => setLiked((v) => !v)}
        type="button"
      >
        <svg width="16" height="16" viewBox="0 0 24 24"
          fill={liked ? "#fff" : "none"} stroke="#fff" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
        </svg>
      </button>

      <div className="dc__info">
        <h3 className="dc__title">{tour.title}</h3>
        <p className="dc__loc">{tour.destination}</p>
        {tour.company_name && tour.company_public_path ? (
          <Link
            href={tour.company_public_path}
            className="tour-company-link"
            aria-label={`View ${tour.company_name}`}
            onClick={(event) => event.stopPropagation()}
          >
            <Star size={12} />
            <span>{tour.company_name}</span>
          </Link>
        ) : null}
        <span className="dc__rating">
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
            stroke="#fff" strokeWidth="2" strokeLinejoin="round">
            <polygon points="12 2 15 9 22 9.3 16.5 14 18.2 21 12 17 5.8 21 7.5 14 2 9.3 9 9" />
          </svg>
          {rating ? (
            <>
              <b>{rating}</b>
              <span>{reviews} reviews</span>
            </>
          ) : (
            <span>No reviews</span>
          )}
        </span>
      </div>

      <button className="dc__cta" onClick={() => router.push(detailHref)} type="button">
        <span>See more</span>
        <i className="dc__chev" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="#0a2a4a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="9 6 15 12 9 18" />
          </svg>
        </i>
      </button>
    </article>
  );
}

