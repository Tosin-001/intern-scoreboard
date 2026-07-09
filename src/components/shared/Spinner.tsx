export default function Spinner({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="d-flex align-items-center justify-content-center gap-2 py-5 text-muted-2">
      <div className="spinner-border spinner-border-sm" role="status" />
      <span>{label}</span>
    </div>
  );
}
