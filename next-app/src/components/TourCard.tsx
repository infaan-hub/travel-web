"use client";

import Image from "next/image";
import Link from "next/link";
import { Building2, Star, Clock, MapPin } from "@/components/icons";
import { getImageUrl } from "@/lib/utils/image-url";

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

  return (
    <article className="tour-card glass-card">
      <div className="tour-card-image">
        {uniqueImages[0] ? (
          <Image
            src={uniqueImages[0]}
            alt={tour.title}
            fill
            sizes="(max-width: 768px) 100vw, 33vw"
            className="tour-card-cover"
            style={{ objectFit: "cover" }}
          />
        ) : <div className="tour-card-image-fallback"><MapPin size={28} /><span>Experience</span></div>}
        <span className={`tour-category ${tour.category}`}>
          {tour.category === "zanzibar"
            ? "Zanzibar"
            : tour.category === "tanzania"
              ? "Tanzania Safari"
              : "International"}
        </span>
      </div>
      <div className="tour-card-body">
        <div className="tour-card-heading">
          <div>
            <h3><Link href={detailHref}>{tour.title}</Link></h3>
            <span className="tour-destination"><MapPin size={14} /> {tour.destination}</span>
          </div>
        </div>
        <p className="tour-card-description">
          {tour.short_description ||
            (tour.description ? `${tour.description.slice(0, 112).trim()}${tour.description.length > 112 ? "…" : ""}` : "Explore this experience and send a booking request to its provider.")}
        </p>
        {tour.company_name && tour.company_public_path ? (
          <Link
            href={tour.company_public_path}
            className="tour-company-link"
            aria-label={`View ${tour.company_name}`}
          >
            <Building2 size={14} />
            <span>{tour.company_name}</span>
          </Link>
        ) : null}
        <div className="tour-card-meta">
          {tour.average_rating ? (
            <span className="tour-rating">
              <span className="stars-display">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    size={12}
                    fill={s <= Math.round(Number(tour.average_rating)) ? "#f59e0b" : "none"}
                    color={s <= Math.round(Number(tour.average_rating)) ? "#f59e0b" : "#d1d5db"}
                  />
                ))}
              </span>
              {Number(tour.average_rating).toFixed(1)} ({tour.review_count || 0})
            </span>
          ) : (
            <span className="tour-rating">
              <span className="stars-display">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star key={s} size={12} fill="none" color="#d1d5db" />
                ))}
              </span>
              No reviews
            </span>
          )}
          <span className="tour-duration">
            <Clock size={14} /> {tour.duration}
          </span>
        </div>
        <div className="tour-card-footer">
          <span className="tour-price">
            From <strong>${tour.price}</strong>
            <span className="tour-per-person"> / person</span>
          </span>
          <Link className="tour-card-action" href={detailHref} aria-label={`View ${tour.title}`}>
            View experience <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
    </article>
  );
}
