import type { HighlightRecord } from "../../types";

export function HighlightToolbar({
  onHighlight
}: {
  onHighlight: (color: HighlightRecord["color"]) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 shadow-panel">
      <span className="text-xs font-semibold uppercase text-slate-500">Highlight</span>
      {(["yellow", "blue", "pink"] as const).map((color) => (
        <button
          aria-label={`Highlight ${color}`}
          className={`h-6 w-6 rounded-full border border-line ${colorClass(color)}`}
          key={color}
          onMouseDown={(event) => event.preventDefault()}
          onClick={() => onHighlight(color)}
          type="button"
        />
      ))}
    </div>
  );
}

function colorClass(color: HighlightRecord["color"]): string {
  if (color === "blue") return "bg-blue-200";
  if (color === "pink") return "bg-pink-200";
  return "bg-yellow-200";
}
