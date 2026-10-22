"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
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
  const router = useRouter();
  const [autoplay] = useState(() => Autoplay({ delay: 5000, stopOnInteraction: false }));

  const images = [
    getImageUrl(tour.main_image_url || tour.image_url),
    ...(tour.gallery_image_urls || []).map((url) => getImageUrl(url)),
    ...(tour.image2_url ? [getImageUrl(tour.image2_url)] : []),
    ...(tour.image3_url ? [getImageUrl(tour.image3_url)] : []),
  ].filter(Boolean);

  const uniqueImages = [...new Set(images)];
  const [emblaRef] = useEmblaCarousel({ loop: uniqueImages.length > 1 }, [autoplay]);

  return (
    <div className="tour-card glass-card" onClick={() => router.push(`/tour/${tour.id}`)}>
      <div className="tour-card-image">
        <div className="embla" ref={emblaRef}>
          <div className="embla__container">
            {uniqueImages.map((img, i) => (
              <div key={i} className="embla__slide">
                <Image
                  src={img}
                  alt={tour.title}
                  fill
                  sizes="(max-width: 768px) 100vw, 33vw"
                  className="embla__slide__img"
                  style={{ objectFit: "cover" }}
                />
              </div>
            ))}
          </div>
        </div>
        <span className={`tour-category ${tour.category}`}>
          {tour.category === "zanzibar"
            ? "Zanzibar"
            : tour.category === "tanzania"
              ? "Tanzania Safari"
              : "International"}
        </span>
      </div>
      <div className="tour-card-body">
        <h3>{tour.title}</h3>
        <p>
          {tour.short_description ||
            (tour.description ? tour.description.slice(0, 120) + "..." : "")}
        </p>
        {tour.company_name && tour.company_public_path ? (
          <Link
            href={tour.company_public_path}
            className="tour-company-link"
            onClick={(event) => event.stopPropagation()}
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
          <span className="tour-destination">
            <MapPin size={14} /> {tour.destination}
          </span>
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
