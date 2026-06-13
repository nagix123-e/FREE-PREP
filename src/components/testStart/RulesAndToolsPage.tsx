import { useAppStore } from "../../store/appStore";

export function RulesAndToolsPage() {
  const { navigate, selectedSetId } = useAppStore();
  return (
    <section className="safe-card-padding-lg mx-auto max-w-4xl rounded-md border border-line bg-white p-8 shadow-panel">
      <h2 className="text-2xl font-semibold">Rules and Tools</h2>
      <div className="mt-6 grid grid-cols-2 gap-4 text-sm">
        {[
          "Use the timer to pace each module.",
          "You can mark questions for review.",
          "Question Menu helps jump between questions.",
          "Highlights, notes, calculator, and math reference are available.",
          "Scores are practice estimates only.",
          "You can pause and resume later."
        ].map((item) => (
          <div className="safe-tile-padding rounded-md border border-line bg-slate-50 p-4" key={item}>{item}</div>
        ))}
      </div>
      <div className="mt-6 flex justify-between">
        <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold" onClick={() => navigate("testOverview", selectedSetId ?? undefined)} type="button">Back</button>
        <button className="rounded-md bg-teal-700 px-5 py-3 text-sm font-semibold text-white" onClick={() => navigate("deviceCheck", selectedSetId ?? undefined)} type="button">Continue</button>
      </div>
    </section>
  );
}
