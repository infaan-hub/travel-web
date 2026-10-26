"use client";

import Link from "next/link";
import Image from "next/image";
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
          {thumbImage ? <Image src={getImageUrl(thumbImage)} alt="" fill sizes="(max-width: 640px) 100vw, 33vw" className={styles.copyBg} /> : null}
          <h1 id="bento-hero-title">Find your<br />next trip</h1>
          <p className={styles.tagline}>Tours, stays and local guides you can trust.</p>
          <div className={styles.actions}>
            <Link className={styles.explore} href="/tours/">Explore</Link>
            <Link className={styles.companies} href="/companies/">Companies</Link>
          </div>
        </div>

        <div className={`${styles.photo} ${styles.mainPhoto}`}>
          {mainImage ? (
            <Image
              src={getImageUrl(mainImage)}
              alt="Explore Tanzania"
              fill
              priority
              sizes="(max-width: 640px) 100vw, 66vw"
            />
          ) : (
            <span className={styles.placeholder}>Your next view starts here</span>
          )}
        </div>

        <div className={`${styles.photo} ${styles.secondPhoto}`}>
          {secondImage ? <Image src={getImageUrl(secondImage)} alt="Discover Zanzibar and Tanzania" fill sizes="(max-width: 640px) 100vw, 33vw" /> : <span className={styles.placeholder}>Made for the journey</span>}
        </div>

        <Link
          className={`${styles.featured} ${featuredImage || featuredTour?.image_url ? styles.featuredHasImage : styles.featuredFallback}`}
          href={featuredTour ? `/tour/${featuredTour.id}/` : "/tours/"}
        >
          {featuredImage || featuredTour?.image_url ? <Image src={getImageUrl(featuredImage || featuredTour?.image_url)} alt="" fill sizes="(max-width: 640px) 100vw, 25vw" /> : null}
          <span className={styles.featuredCopy}>
            <span className={styles.featuredLabel}>A PLACE TO BEGIN</span>
            <strong>{featuredTour?.title || "Find an experience"}</strong>
            <span>{featuredTour?.destination || "Explore tours and safaris"}</span>
          </span>
          <span className={styles.arrow} aria-hidden="true">↗</span>
        </Link>
      </div>
    </section>
  );
}
