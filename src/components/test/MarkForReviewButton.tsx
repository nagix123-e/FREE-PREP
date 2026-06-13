export function MarkForReviewButton({
  marked,
  onToggle
}: {
  marked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      className={`rounded-md border px-3 py-2 text-sm font-semibold ${
        marked
          ? "border-amber-300 bg-amber-50 text-amber-800"
          : "border-line bg-white text-slate-700 hover:bg-slate-50"
      }`}
      onClick={onToggle}
      type="button"
    >
      {marked ? "Starred for Review" : "Mark for Review"}
    </button>
  );
}
