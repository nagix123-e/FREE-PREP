export function ExplanationBlock({ explanation }: { explanation: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-4">
      <div className="text-sm font-semibold">Explanation</div>
      <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">
        {explanation || "No explanation provided."}
      </div>
    </div>
  );
}
