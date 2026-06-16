export function VisualErrorFallback({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-4 text-sm text-muted">
      {message}
    </div>
  );
}

export function VisualUnavailableFallback({ message = "No visual available." }: { message?: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-4 text-sm text-muted">
      {message}
    </div>
  );
}
