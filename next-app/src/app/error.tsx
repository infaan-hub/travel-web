"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error", error);
  }, [error]);

  return (
    <div className="page">
      <div className="empty-state" style={{ textAlign: "center", padding: "64px 24px" }}>
        <h1 style={{ fontSize: "2.5rem", marginBottom: "8px" }}>Something went wrong</h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "24px" }}>
          We could not load this page. Please try again, and if the problem continues contact us.
        </p>
        {error.digest ? (
          <p style={{ color: "var(--text-muted)", fontSize: "0.8rem", marginBottom: "16px" }}>
            Reference: {error.digest}
          </p>
        ) : null}
        <div style={{ display: "flex", gap: "12px", justifyContent: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <Link href="/" className="btn btn-outline">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
