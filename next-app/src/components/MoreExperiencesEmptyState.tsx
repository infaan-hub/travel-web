import styles from "./MoreExperiencesEmptyState.module.css";

type MoreExperiencesEmptyStateProps = {
  onBrowse?: () => void;
};

const cards = [
  { color: "#FFC8D6", className: styles.cardPink, image: true },
  { color: "#FDEBA8", className: styles.cardYellow, image: true },
  { color: "#CFC3F5", className: styles.cardLavender, image: true },
  { color: "#B5D8FA", className: styles.cardBlue, image: false },
  { color: "#B9F0D0", className: styles.cardMint, image: true },
  { color: "#FFD3B0", className: styles.cardPeach, image: true },
  { color: "#F7C4F5", className: styles.cardMagenta, image: true },
];

export default function MoreExperiencesEmptyState({
  onBrowse,
}: MoreExperiencesEmptyStateProps) {
  return (
    <section className={styles.emptyState}>
      <div className={styles.stage} aria-hidden="true">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`${styles.card} ${card.className}`}
            style={{
              backgroundColor: card.color,
              animationDelay: `${index * 70}ms`,
            }}
          >
            {card.image ? (
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
            ) : (
              <div className={styles.skeleton}>
                <span className={styles.skeletonTitle} />
                <span className={styles.skeletonLine} />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className={styles.copy}>
        <h2 className={styles.heading}>More experiences are on the way</h2>
        <p className={styles.subheading}>Browse companies to plan your next trip</p>
        <p className={styles.muted}>
          Tour listings appear here when a provider publishes an experience.
        </p>
        {onBrowse ? (
          <button type="button" className={styles.pill} onClick={onBrowse}>
            Browse companies
          </button>
        ) : null}
      </div>
    </section>
  );
}
