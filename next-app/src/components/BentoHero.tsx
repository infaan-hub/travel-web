"use client";

import Image from "next/image";
import Link from "next/link";
import type { Tour } from "@/features/pages/types";
import { getImageUrl, isUnoptimizableImage } from "@/lib/utils/image-url";
import styles from "./BentoHero.module.css";

type BentoHeroProps = {
  mainImage?: string | null;
  secondImage?: string | null;
  featuredImage?: string | null;
  thumbImage?: string | null;
  featuredTour?: Tour | null;
};

export default function BentoHero({
  mainImage,
  secondImage,
  featuredImage,
  thumbImage,
  featuredTour,
}: BentoHeroProps) {
  const thumbSrc = thumbImage ? getImageUrl(thumbImage) : null;
  const mainSrc = mainImage ? getImageUrl(mainImage) : null;
  const secondSrc = secondImage ? getImageUrl(secondImage) : null;
  const featuredRaw = featuredImage || featuredTour?.image_url || null;
  const featuredSrc = featuredRaw ? getImageUrl(featuredRaw) : null;

  return (
    <section className={styles.frame} aria-labelledby="bento-hero-title">
      <div className={styles.panels}>
        <div className={styles.copy}>
          {thumbSrc ? (
            <Image
              src={thumbSrc}
              alt=""
              fill
              priority
              sizes="(max-width: 640px) 100vw, 440px"
              className={styles.copyBg}
              unoptimized={isUnoptimizableImage(thumbSrc)}
            />
          ) : null}
          <h1 id="bento-hero-title">Find your<br />next trip</h1>
          <p className={styles.tagline}>
            Book trusted drivers and verified vehicles for airport transfers and local journeys across Tanzania.
          </p>
          <div className={styles.actions}>
            <Link className={styles.explore} href="/booking/create/">Explore</Link>
            <Link className={styles.companies} href="/companies/">Companies</Link>
          </div>
        </div>

        <div className={`${styles.photo} ${styles.mainPhoto}`}>
          {mainSrc ? (
            <Image
              src={mainSrc}
              alt="Explore Zanzibar and Tanzania"
              fill
              priority
              sizes="(max-width: 640px) 1px, (max-width: 1100px) 62vw, 680px"
              unoptimized={isUnoptimizableImage(mainSrc)}
            />
          ) : (
            <span className={styles.placeholder}>Your next view starts here</span>
          )}
        </div>

        <div className={`${styles.photo} ${styles.secondPhoto}`}>
          {secondSrc ? (
            <Image
              src={secondSrc}
              alt="Discover Zanzibar and Tanzania"
              fill
              sizes="(max-width: 640px) 1px, (max-width: 1100px) 76vw, 840px"
              unoptimized={isUnoptimizableImage(secondSrc)}
            />
          ) : (
            <span className={styles.placeholder}>Made for the journey</span>
          )}
        </div>

        <Link
          className={`${styles.featured} ${featuredSrc ? styles.featuredHasImage : styles.featuredFallback}`}
          href="/transport/"
        >
          {featuredSrc ? (
            <Image
              src={featuredSrc}
              alt=""
              fill
              sizes="(max-width: 640px) 100vw, 280px"
              unoptimized={isUnoptimizableImage(featuredSrc)}
            />
          ) : null}
          <span className={styles.featuredCopy}>
            <span className={styles.featuredLabel}>PRIVATE HIRE SERVICE</span>
            <strong>Book a private hire vehicle</strong>
            <span>Choose a verified vehicle and driver for your journey.</span>
          </span>
          <span className={styles.arrow} aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}
