interface StatCardProps {
  label: string;
  value: number | string;
  icon?: string;
  tone?: "default" | "success" | "warning" | "danger";
}

const toneClasses: Record<string, string> = {
  default: "bg-primary-subtle text-primary-emphasis",
  success: "bg-success-subtle text-success-emphasis",
  warning: "bg-warning-subtle text-warning-emphasis",
  danger: "bg-danger-subtle text-danger-emphasis",
};

export default function StatCard({ label, value, icon = "📈", tone = "default" }: StatCardProps) {
  return (
    <div className="col-6 col-lg-3">
      <div className="card h-100">
        <div className="card-body d-flex flex-column gap-2">
          <div
            className={`rounded-3 d-inline-flex align-items-center justify-content-center ${toneClasses[tone]}`}
            style={{ width: 36, height: 36, fontSize: "1.1rem" }}
          >
            {icon}
          </div>
          <div className="text-muted-2 small">{label}</div>
          <div className="fs-3 fw-bold">{value}</div>
        </div>
      </div>
    </div>
  );
}
