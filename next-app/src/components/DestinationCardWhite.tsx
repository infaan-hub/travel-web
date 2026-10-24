import { useState } from "react";
import "./DestinationCardWhite.css";

type Stat = {
  value: string;
  label: string;
};

export default function DestinationCardWhite({
  image = "/nigeen-lake.jpg",
  title = "Nigeen Lake",
  location = "Jammu & Kashmir",
  description = "Sail through Kashmir’s quiet gem, where twilight reflections and houseboats create a picture of timeless beauty.",
  stats = [
    { value: "30 Min", label: "Boat Ride Time" },
    { value: "Sunset", label: "Ideal Time" },
    { value: "Calm & Grounded", label: "Energy After" },
  ],
  onSeeMore = () => {},
}: {
  image?: string;
  title?: string;
  location?: string;
  description?: string;
  stats?: Stat[];
  onSeeMore?: () => void;
}) {
  const [liked, setLiked] = useState(false);

  return (
    <article className="dcw">
      <img className="dcw__img" src={image} alt={`${title}, ${location}`} />

      <div className="dcw__body">
        <header className="dcw__head">
          <div>
            <h3 className="dcw__title">{title}</h3>
            <p className="dcw__loc">{location}</p>
          </div>
          <button
            className="dcw__heart"
            aria-label={liked ? "Remove from favourites" : "Add to favourites"}
            aria-pressed={liked}
            onClick={() => setLiked((v) => !v)}
            type="button"
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill={liked ? "#111" : "none"}
              stroke="#111"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1-1.1a5.5 5.5 0 0 0-7.8 7.8l1 1.1L12 21l7.8-7.5 1-1.1a5.5 5.5 0 0 0 0-7.8z" />
            </svg>
          </button>
        </header>

        <p className="dcw__desc">{description}</p>

        <footer className="dcw__foot">
          <dl className="dcw__stats">
            {stats.map((s) => (
              <div key={s.label}>
                <dt>{s.value}</dt>
                <dd>{s.label}</dd>
              </div>
            ))}
          </dl>
          <button className="dcw__cta" onClick={onSeeMore} type="button">
            See more
          </button>
        </footer>
      </div>
    </article>
  );
}
