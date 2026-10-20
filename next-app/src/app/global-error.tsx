"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#0b1220",
          color: "#e2e8f0",
          textAlign: "center",
          padding: "24px",
        }}
      >
        <div>
          <h1 style={{ fontSize: "2rem", marginBottom: "12px" }}>The site could not be loaded</h1>
          <p style={{ color: "#94a3b8", marginBottom: "24px" }}>
            Please refresh the page. If the problem continues, contact support.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              padding: "12px 20px",
              borderRadius: "10px",
              border: "none",
              background: "#22d3ee",
              color: "#052e1b",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
