type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="surface-card flex flex-col items-start gap-3 px-6 py-8">
      <h2 className="font-display text-xl font-semibold text-foreground">{title}</h2>
      <p className="max-w-xl text-sm leading-relaxed text-muted">{description}</p>
      {action ? <div className="pt-1">{action}</div> : null}
    </div>
  );
}
