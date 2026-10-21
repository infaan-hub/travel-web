"use client";

import Link from "next/link";
import { Search } from "@/components/icons";

type HeroMedia = {
  /** Image or video source URL. */
  src: string;
  /** Alt text (required for images, used as aria-label for video). */
  alt: string;
  /** Force a type; otherwise inferred from the file extension. */
  type?: "image" | "video";
};

type HeroCta = {
  label: string;
  href?: string;
  onClick?: () => void;
};

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
  chips?: string[];
  onChipClick?: (chip: string) => void;
  /** Optional full-bleed background media (image or auto-playing muted loop video). */
  media?: HeroMedia;
  /** Up to two primary call-to-action buttons rendered under the subtitle. */
  ctaPrimary?: HeroCta;
  ctaSecondary?: HeroCta;
  children?: React.ReactNode;
};

function isVideo(src: string, type?: "image" | "video"): boolean {
  if (type === "video") return true;
  if (type === "image") return false;
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(src);
}

function renderCta(cta: HeroCta, variant: "primary" | "secondary") {
  const className =
    variant === "primary" ? "btn btn-primary" : "btn btn-secondary";
  const content = <>{cta.label}</>;
  if (cta.href) {
    return (
      <Link key={cta.href} href={cta.href} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <button key={cta.label} type="button" className={className} onClick={cta.onClick}>
      {content}
    </button>
  );
}

/**
 * Full-width, media-backed hero used across the public pages. Renders a
 * centered headline with an optional background image/video, up to two CTA
 * buttons, and the legacy search + chip bar. When no `media` is supplied it
 * falls back to the brand dark-teal gradient so it is always presentable.
 */
export function PageHero({
  eyebrow = "Travel.",
  title,
  subtitle,
  search,
  chips,
  onChipClick,
  media,
  ctaPrimary,
  ctaSecondary,
  children,
}: PageHeroProps) {
  return (
    <header className="page-hero">
      {media ? (
        isVideo(media.src, media.type) ? (
          <video
            className="page-hero-media"
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
          >
            <source src={media.src} type="video/mp4" />
          </video>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="page-hero-media"
            src={media.src}
            alt={media.alt}
            aria-hidden="true"
          />
        )
      ) : null}

      <div className="page-hero-inner">
        <p className="page-hero-eyebrow">{eyebrow}</p>
        <h1 className="page-hero-title">{title}</h1>
        {subtitle ? <p className="page-hero-subtitle">{subtitle}</p> : null}

        {(ctaPrimary || ctaSecondary) && (
          <div className="page-hero-cta">
            {ctaPrimary ? renderCta(ctaPrimary, "primary") : null}
            {ctaSecondary ? renderCta(ctaSecondary, "secondary") : null}
          </div>
        )}

        {search ? (
          <div className="page-hero-search">
            <Search size={18} aria-hidden="true" />
            <input
              type="search"
              value={search.value}
              onChange={(event) => search.onChange(event.target.value)}
              placeholder={search.placeholder ?? "Search"}
              aria-label={search.placeholder ?? "Search"}
            />
          </div>
        ) : null}

        {chips && chips.length > 0 ? (
          <div className="page-hero-chips">
            {chips.map((chip) => (
              <button
                key={chip}
                type="button"
                className="page-hero-chip"
                onClick={onChipClick ? () => onChipClick(chip) : undefined}
              >
                {chip}
              </button>
            ))}
          </div>
        ) : null}

        {children}
      </div>
    </header>
  );
}
