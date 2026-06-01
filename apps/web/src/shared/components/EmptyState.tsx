type EmptyStateProps = {
  title: string;
  message: string;
};

export function EmptyState({ title, message }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div className="empty-state-mark" aria-hidden="true">
        {title.slice(0, 1)}
      </div>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}
