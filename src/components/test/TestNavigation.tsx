export function TestNavigation({
  canGoBack,
  canGoNext,
  onBack,
  onNext,
  onOpenMenu,
  onReview,
  submitMode = false
}: {
  canGoBack: boolean;
  canGoNext: boolean;
  onBack: () => void;
  onNext: () => void;
  onOpenMenu: () => void;
  onReview: () => void;
  submitMode?: boolean;
}) {
  const primaryAction = submitMode ? onReview : onNext;

  return (
    <footer className="test-navigation-bar flex items-center justify-between border-t border-line bg-white px-6 py-4">
      <button
        className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!canGoBack}
        onClick={onBack}
        type="button"
      >
        Back
      </button>
      <div className="flex items-center gap-3">
        <button
          className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={onOpenMenu}
          type="button"
        >
          Question Menu
        </button>
        <button
          className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          onClick={onReview}
          type="button"
        >
          Review Module
        </button>
      </div>
      <button
        className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300"
        disabled={!submitMode && !canGoNext}
        onClick={primaryAction}
        type="button"
      >
        {submitMode ? "Submit Scores" : "Next"}
      </button>
    </footer>
  );
}
