import styles from "./MoreExperiencesEmptyState.module.css";

type MoreExperiencesEmptyStateProps = {
  imageUrls?: (string | null | undefined)[];
};

const cards = [
  { color: "#FFC8D6", className: styles.cardPink, imageIndex: 0 },
  { color: "#FDEBA8", className: styles.cardYellow, imageIndex: 1 },
  { color: "#CFC3F5", className: styles.cardLavender, imageIndex: 2 },
  { color: "#B9F0D0", className: styles.cardMint, imageIndex: 3 },
  { color: "#FFD3B0", className: styles.cardPeach, imageIndex: 4 },
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
  return (
    <section className={styles.emptyState} aria-labelledby="more-experiences-heading">
      <div className={styles.stage} aria-hidden="true">
        {cards.map((card, index) => {
          const image = imageUrls[card.imageIndex];
          return (
            <div
              key={card.className}
              className={`${styles.card} ${card.className}`}
              style={{
                backgroundColor: image ? "transparent" : card.color,
                animationDelay: `${index * 70}ms, ${index * 70 + 420}ms`,
              }}
            >
              {image ? (
                <img className={styles.cardImage} src={image} alt="" loading="lazy" />
              ) : (
                <PhotoGlyph />
              )}
            </div>
          );
        })}
      </div>

      <div className={styles.copy}>
        <h2 id="more-experiences-heading" className={styles.heading}>
          More experiences are on the way
        </h2>
        <p className={styles.subheading}>Browse companies to plan your next trip</p>
        <p className={styles.muted}>
          Tour listings appear here when a provider publishes an experience.
        </p>
      </div>
    </section>
  );
}
