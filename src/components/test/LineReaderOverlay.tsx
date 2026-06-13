export function LineReaderOverlay({ y }: { y: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-4 right-4 z-10 h-10 rounded-md border border-teal-300 bg-teal-50/45"
      style={{ top: y }}
    />
  );
}
