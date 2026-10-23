"use client";

import { motion, useReducedMotion } from "motion/react";
import styles from "./MoreExperiencesEmptyState.module.css";

type MoreExperiencesEmptyStateProps = {
  imageUrls?: (string | null | undefined)[];
};

const cards = [
  { color: "#FFC8D6", className: styles.cardPink, imageIndex: 0, rotation: -8 },
  { color: "#FDEBA8", className: styles.cardYellow, imageIndex: 1, rotation: 6 },
  { color: "#CFC3F5", className: styles.cardLavender, imageIndex: 2, rotation: -5 },
  { color: "#B9F0D0", className: styles.cardMint, imageIndex: 3, rotation: 6 },
  { color: "#FFD3B0", className: styles.cardPeach, imageIndex: 4, rotation: -4 },
];

function PhotoGlyph() {
  return (
    <svg
      className={styles.photoGlyph}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <circle cx="12" cy="12" r="3" />
      <path d="M8 5l1.2-2h5.6L16 5" />
    </svg>
  );
}

export default function MoreExperiencesEmptyState({
  imageUrls = [],
}: MoreExperiencesEmptyStateProps) {
  const reduceMotion = useReducedMotion();

  return (
    <div className={styles.emptyState}>
      <div className={styles.stage} aria-hidden="true" data-testid="more-experiences-stage">
        {cards.map((card, index) => {
          const image = imageUrls[card.imageIndex];

          return (
            <motion.div
              key={card.className}
              className={`${styles.card} ${card.className}`}
              style={{ backgroundColor: image ? "transparent" : card.color }}
              initial={
                reduceMotion
                  ? { opacity: 1, y: 0, scale: 1, rotate: card.rotation }
                  : { opacity: 0, y: -44, scale: 0.86, rotate: card.rotation - 10 }
              }
              whileInView={{ opacity: 1, y: 0, scale: 1, rotate: card.rotation }}
              viewport={{ once: true, amount: 0.25 }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : {
                      type: "spring",
                      stiffness: 120,
                      damping: 16,
                      mass: 0.9,
                      delay: index * 0.09,
                    }
              }
              whileHover={
                reduceMotion
                  ? undefined
                  : {
                      scale: 1.05,
                      rotate: card.rotation + 2,
                      transition: { type: "spring", stiffness: 260, damping: 18 },
                    }
              }
            >
              <motion.div
                className={styles.float}
                animate={reduceMotion ? undefined : { y: [0, -10, 0] }}
                transition={
                  reduceMotion
                    ? undefined
                    : {
                        duration: 3.8 + index * 0.35,
                        repeat: Number.POSITIVE_INFINITY,
                        ease: "easeInOut",
                        delay: 0.7 + index * 0.1,
                      }
                }
              >
                {image ? (
                  <img className={styles.cardImage} src={image} alt="" loading="lazy" />
                ) : (
                  <PhotoGlyph />
                )}
              </motion.div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
