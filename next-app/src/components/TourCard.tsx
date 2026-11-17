"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import {
  Building2,
  CheckCircle,
  Clock,
  MapPin,
  Star,
} from "@/components/icons";
import { getImageUrl } from "@/lib/utils/image-url";
import tourStyles from "@/features/pages/company-tours.module.css";

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
  const [liked] = useState(false);

  const rating =
    tour.average_rating != null ? Number(tour.average_rating).toFixed(1) : null;
  const reviews = tour.review_count || 0;
  const price = Number(tour.price) > 0 ? `$${Number(tour.price).toLocaleString()}` : null;

  return (
    <article className={`${tourStyles.toursCard} tour-card-company`}>
      <div className={tourStyles.toursMedia}>
        {uniqueImages[0] ? (
          <Image
            className={tourStyles.toursMediaImg}
            src={uniqueImages[0]}
            alt={`${tour.title}, ${tour.destination}`}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 980px) 50vw, 33vw"
          />
        ) : (
          <span className={tourStyles.toursMediaFallback} aria-hidden="true">
            Experience
          </span>
        )}
        <span className={tourStyles.toursMediaShade} aria-hidden="true" />
        <span className={tourStyles.toursCategory}>
          {tour.category?.trim() || "Experience"}
        </span>
        <span className={`${tourStyles.toursStatus} ${tourStyles.toursAvailabilityOn}`}>
          <span className={tourStyles.toursStatusDot} aria-hidden="true" />
          Available
        </span>
      </div>

      <div className={tourStyles.toursBody}>
        <h3 className={tourStyles.toursCardTitle}>
          <Link href={detailHref}>{tour.title}</Link>
        </h3>
        <p className={tourStyles.toursMeta}>
          <span className={tourStyles.toursMetaItem}>
            <MapPin size={13} aria-hidden="true" />
            <span>{tour.destination || "No destination"}</span>
          </span>
          <span className={tourStyles.toursMetaItem}>
            <Clock size={13} aria-hidden="true" />
            <span>{tour.duration || "Flexible duration"}</span>
          </span>
        </p>
        {tour.short_description?.trim() ? (
          <p className={tourStyles.toursCopy}>{tour.short_description}</p>
        ) : null}
        <div className={tourStyles.toursSignals}>
          {rating !== null ? (
            <span className={tourStyles.toursRating}>
              <Star size={13} aria-hidden="true" />
              {rating}
              <span className={tourStyles.toursRatingMuted}>({reviews})</span>
            </span>
          ) : (
            <span className={`${tourStyles.toursRating} ${tourStyles.toursRatingMuted}`}>
              No reviews yet
            </span>
          )}
          <span
            className={`${tourStyles.toursAvailability} ${tourStyles.toursAvailabilityOn}`}
          >
            <CheckCircle size={12} aria-hidden="true" />
            Available
          </span>
        </div>
        <div className={tourStyles.toursFoot}>
          <div className={tourStyles.toursPrice}>
            <span className={tourStyles.toursPriceValue}>
              {price ?? "Price on request"}
            </span>
            <span className={tourStyles.toursPriceHint}>
              {price ? "per person" : "No price set"}
            </span>
          </div>
          {tour.company_name && tour.company_public_path ? (
            <Link
              href={tour.company_public_path}
              className={tourStyles.toursIconAction}
              aria-label={`View ${tour.company_name}`}
              onClick={(event) => event.stopPropagation()}
            >
              <Building2 size={14} />
            </Link>
          ) : null}
        </div>
      </div>

      <div className={tourStyles.toursCardActions}>
        <Link className="btn btn-blue btn-sm" href={detailHref}>
          View details
        </Link>
      </div>
    </article>
  );
}