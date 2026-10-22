import styles from "./MoreExperiencesEmptyState.module.css";

type MoreExperiencesEmptyStateProps = {
  onBrowse?: () => void;
  imageUrl?: string | null;
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
  onBrowse,
  imageUrl,
}: MoreExperiencesEmptyStateProps) {
  return (
    <section className={styles.emptyState}>
      <div className={styles.stage} aria-hidden="true">
        {imageUrl ? (
          <img className={styles.stageImage} src={imageUrl} alt="" />
        ) : (
          cards.map((card, index) => (
            <div
              key={card.className}
              className={`${styles.card} ${card.className}`}
              style={{
                backgroundColor: card.color,
                animationDelay: `${index * 70}ms, ${index * 70 + 420}ms`,
              }}
            >
              {card.image ? (
                <PhotoGlyph />
              ) : (
                <div className={styles.skeleton}>
                  <span className={styles.skeletonTitle} />
                  <span className={styles.skeletonLine} />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {onBrowse ? (
        <button type="button" className={styles.pill} onClick={onBrowse}>
          Browse companies
        </button>
      ) : null}
    </section>
  );
}
