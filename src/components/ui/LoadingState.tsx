export function LoadingState({ message = "Laster..." }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-4">
      <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin mb-4" />
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] p-8 text-center">
      {icon && <div className="mb-4 text-muted-foreground">{icon}</div>}
      <h3 className="text-lg font-semibold mb-1">{title}</h3>
      {description && (
        <p className="text-muted-foreground text-sm max-w-xs">{description}</p>
      )}
    </div>
  );
}
