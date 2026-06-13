import { MathRenderer } from "./MathRenderer";

export function ReferenceSheetModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35">
      <section className="reference-sheet-modal overflow-auto rounded-md border border-line bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Math Reference</h2>
          <button className="text-sm font-semibold text-slate-600" onClick={onClose} type="button">Close</button>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <Formula title="Area of rectangle" latex="A = lw" />
          <Formula title="Area of triangle" latex="A = \\frac{1}{2}bh" />
          <Formula title="Circle area" latex="A = \\pi r^2" />
          <Formula title="Circle circumference" latex="C = 2\\pi r" />
          <Formula title="Rectangular prism volume" latex="V = lwh" />
          <Formula title="Cylinder volume" latex="V = \\pi r^2h" />
          <Formula title="Pythagorean theorem" latex="a^2 + b^2 = c^2" />
          <Formula title="30-60-90 triangle" latex="x, x\\sqrt{3}, 2x" />
        </div>
      </section>
    </div>
  );
}

function Formula({ latex, title }: { latex: string; title: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-3">
      <div className="mb-2 font-semibold">{title}</div>
      <MathRenderer latex={latex} />
    </div>
  );
}
