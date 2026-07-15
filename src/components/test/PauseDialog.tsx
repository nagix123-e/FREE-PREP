export function PauseDialog({
  exitButtonClassName = "",
  onResume,
  onExit
}: {
  exitButtonClassName?: string;
  onResume: () => void;
  onExit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center bg-slate-950/40">
      <div className="pause-dialog-panel rounded-md border border-line bg-white p-6 shadow-xl">
        <h2 className="text-xl font-semibold">Practice Paused</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Your current question, answers, marked questions, eliminated choices, and timer are saved.
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            className={`rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${exitButtonClassName}`}
            onClick={onExit}
            type="button"
          >
            Exit to Home
          </button>
          <button
            className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
            onClick={onResume}
            type="button"
          >
            Resume
          </button>
        </div>
      </div>
    </div>
  );
}
