import { TEST_MODULES } from "../../lib/testPlan";
import { useAppStore } from "../../store/appStore";

export function TestOverviewPage() {
  const { navigate, selectedSetId, tutorial, setTutorialStep } = useAppStore();
  const isTutorialTarget = tutorial.active && tutorial.step === "test_overview_continue";
  return (
    <section className="safe-card-padding-lg mx-auto max-w-4xl rounded-md border border-line bg-white p-8 shadow-panel">
      <h2 className="text-2xl font-semibold">Test Overview</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        This is a practice simulator. Scores are estimates. No official affiliation.
      </p>
      <div className="mt-6 grid grid-cols-2 gap-4">
        {TEST_MODULES.map((module, index) => (
          <div className="safe-tile-padding rounded-md border border-line bg-slate-50 p-4" key={module.key}>
            <div className="text-sm font-semibold">{index + 1}. {module.title}</div>
            <div className="mt-1 text-xs text-muted">{module.questionCount} questions · {module.minutes} minutes</div>
          </div>
        ))}
      </div>
      <button
        className={`mt-6 rounded-md bg-teal-700 px-5 py-3 text-sm font-semibold text-white ${
          isTutorialTarget ? "tutorial-active-target tutorial-target-ring" : ""
        }`}
        onClick={() => {
          if (isTutorialTarget) setTutorialStep("rules_continue");
          navigate("rulesAndTools", selectedSetId ?? undefined);
        }}
        type="button"
      >
        Continue
      </button>
    </section>
  );
}
