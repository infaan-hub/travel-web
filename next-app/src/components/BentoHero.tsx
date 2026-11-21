"use client";


"use client";

import Link from "next/link";
import type { Tour } from "@/features/pages/types";
import { getImageUrl } from "@/lib/utils/image-url";
import styles from "./BentoHero.module.css";

type BentoHeroProps = {
  mainImage?: string | null;
  secondImage?: string | null;
  featuredImage?: string | null;
  thumbImage?: string | null;
  featuredTour?: Tour | null;
};

export default function BentoHero({ mainImage, secondImage, featuredImage, thumbImage, featuredTour }: BentoHeroProps) {
  return (
    <section className={styles.frame} aria-labelledby="bento-hero-title">
      <div className={styles.panels}>
        <div className={styles.copy}>
          {thumbImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={getImageUrl(thumbImage)} alt="" className={styles.copyBg} />
          ) : null}
          <h1 id="bento-hero-title">Find your<br />next trip</h1>
          <p className={styles.tagline}>Book trusted drivers and verified vehicles for airport transfers and local journeys across Tanzania.</p>
          <div className={styles.actions}>
            <Link className={styles.explore} href="/booking/create/">Explore</Link>
            <Link className={styles.companies} href="/companies/">Companies</Link>
          </div>
        </div>

        <div className={`${styles.photo} ${styles.mainPhoto}`}>
          {mainImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={getImageUrl(mainImage)} alt="Explore Tanzania" />
          ) : (
            <span className={styles.placeholder}>Your next view starts here</span>
          )}
        </div>

        <div className={`${styles.photo} ${styles.secondPhoto}`}>
          {secondImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={getImageUrl(secondImage)} alt="Discover Zanzibar and Tanzania" />
          ) : (
            <span className={styles.placeholder}>Made for the journey</span>
          )}
        </div>

        <Link
          className={`${styles.featured} ${featuredImage || featuredTour?.image_url ? styles.featuredHasImage : styles.featuredFallback}`}
          href="/transport/"
        >
          {featuredImage || featuredTour?.image_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={getImageUrl(featuredImage || featuredTour?.image_url)} alt="" />
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
