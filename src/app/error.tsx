"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log to the server console at minimum; swap for Sentry/similar later.
    console.error("Unhandled error:", error);
  }, [error]);

  return (
    <main
      className="d-flex align-items-center justify-content-center px-3"
      style={{ minHeight: "100vh", background: "var(--brand-bg)" }}
    >
      <div className="card p-4 text-center" style={{ maxWidth: 420, width: "100%" }}>
        <div className="fs-1 mb-2">⚠️</div>
        <h1 className="h5 fw-bold mb-2">Something went wrong</h1>
        <p className="text-muted-2 small mb-4">
          An unexpected error occurred. You can try again, or head back to
          the dashboard.
        </p>
        <div className="d-flex gap-2 justify-content-center">
          <button className="btn btn-primary" onClick={reset}>
            Try again
          </button>
          <a href="/dashboard" className="btn btn-outline-secondary">
            Go to Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
