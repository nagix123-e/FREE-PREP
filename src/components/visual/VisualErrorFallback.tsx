export function VisualErrorFallback({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-900">
      {message}
    </div>
  );
}
