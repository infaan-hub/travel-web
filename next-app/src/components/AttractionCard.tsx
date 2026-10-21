"use client";

import Image from "next/image";
import { MapPin, Calendar, DollarSign } from "lucide-react";
import { getImageUrl } from "@/lib/utils/image-url";

type Attraction = {
  name: string;
  image_url?: string | null;
  category?: string;
  location: string;
  description?: string;
  best_time_to_visit?: string;
  entry_fee?: string;
};

export default function AttractionCard({ attraction }: { attraction: Attraction }) {
  return (
    <div className="attraction-card glass-card">
      <div className="attraction-card-image">
        <Image
          src={getImageUrl(attraction.image_url) || ""}
          alt={attraction.name}
          fill
          sizes="(max-width: 768px) 100vw, 33vw"
          style={{ objectFit: "cover" }}
        />
        {attraction.category ? (
          <span className={`attraction-category ${attraction.category}`}>
            {attraction.category.replace("_", " ")}
          </span>
        ) : null}
      </div>
      <div className="attraction-card-body">
        <h3>{attraction.name}</h3>
        <p className="attraction-location">
          <MapPin size={14} /> {attraction.location}
        </p>
        {attraction.description ? (
          <p className="attraction-desc">
            {attraction.description.slice(0, 150)}...
          </p>
        ) : null}
        <div className="attraction-info">
          <span>
            <Calendar size={14} /> {attraction.best_time_to_visit || "All year"}
          </span>
          {attraction.entry_fee && (
            <span>
              <DollarSign size={14} /> {attraction.entry_fee}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
