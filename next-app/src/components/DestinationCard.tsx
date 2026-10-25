import { useState } from "react";
import Image from "next/image";
import "./DestinationCard.css";

type Stat = {
  value: string;
  label: string;
};

export default function DestinationCard({
  image = "/nigeen-lake.jpg",
  title = "Nigeen Lake",
  location = "Jammu & Kashmir",
  rating = "4.9",
  reviews = 179,
  description,
  stats,
  onSeeMore = () => {},
  hideCta = false,
  hideLike = false,
  boldText = false,
}: {
  image?: string;
  title?: string;
  location?: string;
  rating?: string | number;
  reviews?: number;
  description?: string;
  stats?: Stat[];
  onSeeMore?: () => void;
  hideCta?: boolean;
  hideLike?: boolean;
  boldText?: boolean;
}) {
  const [liked, setLiked] = useState(false);

  return (
    <article className={`dc${stats ? " dc--company" : ""}${hideCta ? " dc--no-cta" : ""}${boldText ? " dc--bold-text" : ""}`}>
      <Image
        className="dc__img"
        src={image}
        alt={`${title}, ${location}`}
        fill
        sizes="(max-width: 768px) 100vw, 300px"
        style={{ objectFit: "cover" }}
      />
      <div className="dc__shade" />

      {!hideLike && (
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
      )}

      <div className="dc__info">
        <h3 className="dc__title">{title}</h3>
        <p className="dc__loc">{location}</p>
        {description ? <p className="dc__description">{description}</p> : null}
        {stats ? (
          <dl className="dc__stats">
            {stats.map((stat) => (
              <div key={stat.label}>
                <dt>{stat.value}</dt>
                <dd>{stat.label}</dd>
              </div>
            ))}
          </dl>
        ) : (
          <span className="dc__rating">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
              stroke="#fff" strokeWidth="2" strokeLinejoin="round">
              <polygon points="12 2 15 9 22 9.3 16.5 14 18.2 21 12 17 5.8 21 7.5 14 2 9.3 9 9" />
            </svg>
            <b>{rating}</b>
            <span>{reviews} reviews</span>
          </span>
        )}
      </div>

      {!hideCta && (
        <button className="dc__cta" onClick={onSeeMore} type="button">
          <span>See more</span>
          <i className="dc__chev" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="#0a2a4a" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </i>
        </button>
      )}
    </article>
  );
}
