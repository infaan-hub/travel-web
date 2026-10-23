"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import styles from "./PageHero.module.css";

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
  chips?: string[];
  onChipClick?: (chip: string) => void;
  /** Optional full-bleed background media (image or auto-playing muted loop video). */
  media?: HeroMedia;
  /** Up to two primary call-to-action buttons rendered under the subtitle. */
  ctaPrimary?: HeroCta;
  ctaSecondary?: HeroCta;
  children?: ReactNode;
};

function isVideo(src: string, type?: "image" | "video"): boolean {
  if (type === "video") return true;
  if (type === "image") return false;
  return /\.(mp4|webm|ogg|mov)(\?|$)/i.test(src);
}

function renderCta(cta: HeroCta, variant: "primary" | "secondary") {
  const className = variant === "primary" ? styles.ctaPrimary : styles.ctaSecondary;
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
 * Single-card Bento hero used across the public pages. It keeps the home
 * page's pastel panel language — cream copy, clipped corner, thumbnail and
 * pill controls — while giving every page one consistent hero card.
 */
export function PageHero({
  eyebrow = "Travel.",
  title,
  subtitle,
  chips,
  onChipClick,
  media,
  ctaPrimary,
  ctaSecondary,
  children,
}: PageHeroProps) {
  return (
    <header className={styles.hero}>
      <div className={styles.card}>
        {media ? (
          isVideo(media.src, media.type) ? (
            <video
              className={styles.media}
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
              className={styles.media}
              src={media.src}
              alt={media.alt}
              aria-hidden="true"
            />
          )
        ) : null}

        <span className={styles.scrim} aria-hidden="true" />
        <span className={styles.pattern} aria-hidden="true" />

        <div className={styles.inner}>
          <span className={styles.thumb} aria-hidden="true">✦</span>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 className={styles.title}>{title}</h1>
          {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}

          {(ctaPrimary || ctaSecondary) && (
            <div className={styles.actions}>
              {ctaPrimary ? renderCta(ctaPrimary, "primary") : null}
              {ctaSecondary ? renderCta(ctaSecondary, "secondary") : null}
            </div>
          )}

          {chips && chips.length > 0 ? (
            <div className={styles.chips}>
              {chips.map((chip) => (
                onChipClick ? (
                  <button
                    key={chip}
                    type="button"
                    className={styles.chip}
                    onClick={() => onChipClick(chip)}
                  >
                    {chip}
                  </button>
                ) : (
                  <span key={chip} className={styles.chip}>{chip}</span>
                )
              ))}
            </div>
          ) : null}

          {children ? <div className={styles.children}>{children}</div> : null}
        </div>
      </div>
    </header>
  );
}
