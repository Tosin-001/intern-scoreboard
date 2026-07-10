export default function NotFound() {
  return (
    <main
      className="d-flex align-items-center justify-content-center px-3"
      style={{ minHeight: "100vh", background: "var(--brand-bg)" }}
    >
      <div className="card p-4 text-center" style={{ maxWidth: 420, width: "100%" }}>
        <div className="fs-1 mb-2">🔍</div>
        <h1 className="h5 fw-bold mb-2">Page not found</h1>
        <p className="text-muted-2 small mb-4">
          The page you&apos;re looking for doesn&apos;t exist or may have
          moved.
        </p>
        <div className="d-flex gap-2 justify-content-center">
          <a href="/" className="btn btn-primary">
            View Leaderboard
          </a>
          <a href="/dashboard" className="btn btn-outline-secondary">
            Go to Dashboard
          </a>
        </div>
      </div>
    </main>
  );
}
