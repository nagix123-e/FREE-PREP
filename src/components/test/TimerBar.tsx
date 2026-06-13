export function TimerBar({
  hidden,
  remainingTimeSec,
  onToggleHidden
}: {
  hidden: boolean;
  remainingTimeSec: number;
  onToggleHidden: () => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold">
        {hidden ? "Timer hidden" : formatTime(remainingTimeSec)}
      </div>
      <button
        className="rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
        onClick={onToggleHidden}
        type="button"
      >
        {hidden ? "Show Timer" : "Hide Timer"}
      </button>
    </div>
  );
}

function formatTime(totalSeconds: number): string {
  const minutes = Math.floor(Math.max(totalSeconds, 0) / 60);
  const seconds = Math.max(totalSeconds, 0) % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
