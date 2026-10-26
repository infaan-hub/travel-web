export default function Loading() {
  return (
    <div className="page-skeleton" aria-busy="true" aria-live="polite">
      <div className="page-skeleton__hero" />
      <div className="page-skeleton__grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div key={index} className="page-skeleton__card">
            <div className="page-skeleton__image" />
            <div className="page-skeleton__line page-skeleton__line--title" />
            <div className="page-skeleton__line" />
            <div className="page-skeleton__line page-skeleton__line--short" />
          </div>
        ))}
      </div>
      <style>{`
        .page-skeleton { padding: 24px; max-width: 1200px; margin: 0 auto; }
        .page-skeleton__hero { height: 260px; border-radius: 20px; background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: page-skeleton-shimmer 1.4s infinite; margin-bottom: 24px; }
        .page-skeleton__grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
        .page-skeleton__card { padding: 12px; border-radius: 16px; background: #fff; box-shadow: 0 1px 3px rgba(15,23,42,.08); }
        .page-skeleton__image { height: 150px; border-radius: 12px; background: linear-gradient(90deg, #e2e8f0 25%, #f1f5f9 50%, #e2e8f0 75%); background-size: 200% 100%; animation: page-skeleton-shimmer 1.4s infinite; margin-bottom: 12px; }
        .page-skeleton__line { height: 12px; border-radius: 999px; background: #e2e8f0; margin-bottom: 8px; }
        .page-skeleton__line--title { height: 16px; width: 70%; }
        .page-skeleton__line--short { width: 45%; }
        @keyframes page-skeleton-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
      `}</style>
    </div>
  );
}