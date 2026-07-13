interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-5">
      {icon && (
        <div
          className="d-inline-flex align-items-center justify-content-center rounded-circle mb-3"
          style={{ width: 56, height: 56, backgroundColor: "var(--brand-gray-100)", color: "var(--brand-text-muted)" }}
        >
          {icon}
        </div>
      )}
      <h3 className="h6 fw-bold mb-1">{title}</h3>
      {description && <p className="text-muted-2 small mb-3">{description}</p>}
      {action}
    </div>
  );
}
