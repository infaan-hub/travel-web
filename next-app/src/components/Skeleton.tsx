/** Simple shimmering placeholder used while data is loading. */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`.trim()} aria-hidden="true" />;
}

export function SkeletonList({ rows = 3, className = "" }: { rows?: number; className?: string }) {
  return (
    <div className={`skeleton-list ${className}`.trim()} aria-hidden="true">
      {Array.from({ length: rows }).map((_, index) => (
        <Skeleton key={index} className="skeleton-row" />
      ))}
    </div>
  );
}
