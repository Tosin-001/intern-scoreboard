export default function DeltaBadge({ oldScore, newScore }: { oldScore: number; newScore: number }) {
  const delta = newScore - oldScore;
  const increased = delta > 0;
  return (
    <span
      className={`badge ${
        increased ? "bg-success-subtle text-success-emphasis" : "bg-danger-subtle text-danger-emphasis"
      }`}
    >
      {increased ? "+" : ""}
      {delta}
    </span>
  );
}
