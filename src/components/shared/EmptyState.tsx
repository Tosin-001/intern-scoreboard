interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({ icon = "📋", title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-5">
      <div className="fs-1 mb-3">{icon}</div>
      <h3 className="h6 fw-bold mb-1">{title}</h3>
      {description && <p className="text-muted-2 small mb-3">{description}</p>}
      {action}
    </div>
  );
}
