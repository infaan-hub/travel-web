import Link from "next/link";

export default function NotFound() {
  return (
    <div className="page">
      <div className="empty-state" style={{ textAlign: "center", padding: "64px 24px" }}>
        <h1 style={{ fontSize: "3rem", marginBottom: "8px" }}>404</h1>
        <h2 style={{ marginBottom: "12px" }}>This page could not be found</h2>
        <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
          The tour or page you are looking for is no longer available.
        </p>
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/" className="btn btn-primary">
            Back to home
          </Link>
          <Link href="/tours/" className="btn btn-outline">
            Browse tours
          </Link>
        </div>
      </div>
    </div>
  );
}
