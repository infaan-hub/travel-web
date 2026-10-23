"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { homeSettingsAPI } from "@/lib/api/client";
import { getImageUrl } from "@/lib/utils/image-url";
import type { HomeSettings } from "@/features/pages/types";
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

export type HomeHeroImageKey =
  | "hero"
  | "secondary"
  | "feature"
  | "thumb"
  | "zanzibar"
  | "more1"
  | "more2"
  | "more3"
  | "more4"
  | "more5";

type PageHeroProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  chips?: string[];
  onChipClick?: (chip: string) => void;
  /** Optional full-bleed background media (image or auto-playing muted loop video). */
  media?: HeroMedia;
  /** Home-settings image slot used for this page's hero background. */
  backgroundImageKey?: HomeHeroImageKey;
  /** Home-settings image slot used for this page's faded pattern image. */
  patternImageKey?: HomeHeroImageKey;
  /** Optional page-specific pattern image, used for per-tour detail heroes. */
  patternMedia?: string;
  /** Up to two primary call-to-action buttons rendered under the subtitle. */
  ctaPrimary?: HeroCta;
  ctaSecondary?: HeroCta;
  children?: ReactNode;
};

function resolveHomeImage(settings: HomeSettings | null, key?: HomeHeroImageKey): string | null {
  if (!settings || !key) return null;
  switch (key) {
    case "hero":
      return settings.hero_image_url ?? null;
    case "secondary":
      return settings.hero_secondary_image_url ?? null;
    case "feature":
      return settings.hero_feature_image_url ?? null;
    case "thumb":
      return settings.hero_thumb_image_url ?? null;
    case "zanzibar":
      return settings.zanzibar_image_url ?? null;
    case "more1":
    case "more2":
    case "more3":
    case "more4":
    case "more5": {
      const index = Number(key.replace("more", "")) - 1;
      return settings.more_experiences_image_urls?.[index] ?? null;
    }
    default:
      return null;
  }
}

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
  backgroundImageKey,
  patternImageKey,
  patternMedia,
  ctaPrimary,
  ctaSecondary,
  children,
}: PageHeroProps) {
  const [settings, setSettings] = useState<HomeSettings | null>(null);

  useEffect(() => {
    let cancelled = false;
    homeSettingsAPI
      .get()
      .then((response) => {
        if (!cancelled) setSettings(response.data as HomeSettings);
      })
      .catch(() => {
        if (!cancelled) setSettings(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const backgroundUrl = media?.src ?? getImageUrl(resolveHomeImage(settings, backgroundImageKey));
  const patternUrl = patternMedia ?? getImageUrl(resolveHomeImage(settings, patternImageKey));
  const hasPatternImage = Boolean(patternUrl);

  return (
    <header className={styles.hero}>
      <div className={styles.card}>
        {backgroundUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.media}
            src={backgroundUrl}
            alt={media?.alt ?? ""}
            aria-hidden="true"
          />
        ) : null}

        <span className={styles.scrim} aria-hidden="true" />
        {hasPatternImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className={styles.patternImage}
            src={patternUrl}
            alt=""
            aria-hidden="true"
          />
        ) : (
          <span className={styles.pattern} aria-hidden="true" />
        )}

        <div className={styles.inner}>
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
