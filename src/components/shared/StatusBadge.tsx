import type { Status } from "@/types/firestore";

export default function StatusBadge({ status }: { status: Status }) {
  const classes: Record<Status, string> = {
    Excellent: "bg-success-subtle text-success-emphasis",
    Good: "bg-primary-subtle text-primary-emphasis",
    Average: "bg-warning-subtle text-warning-emphasis",
    "Needs Improvement": "bg-secondary-subtle text-secondary-emphasis",
  };

  return (
    <span className={`badge rounded-pill fw-medium px-3 py-2 ${classes[status]}`}>
      {status}
    </span>
  );
}
