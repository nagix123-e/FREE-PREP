import { useEffect, useState } from "react";
import { HomeScreen } from "./components/HomeScreen";
import { DashboardPage } from "./components/DashboardPage";
import { ImportScreen } from "./components/ImportScreen";
import { ModuleReviewPage } from "./components/ModuleReviewPage";
import { PreviewScreen } from "./components/PreviewScreen";
import { QuestionSetsScreen } from "./components/QuestionSetsScreen";
import { ResultPage } from "./components/ResultPage";
import { ReviewAnswersPage } from "./components/ReviewAnswersPage";
import { ReviewListPage } from "./components/ReviewListPage";
import { ScoreHistoryPage } from "./components/ScoreHistoryPage";
import { AchievementsPage } from "./components/AchievementsPage";
import { SectionBreakPage } from "./components/SectionBreakPage";
import { SettingsScreen } from "./components/SettingsScreen";
import { TestRunnerPage } from "./components/TestRunnerPage";
import { TestSetupPage } from "./components/TestSetupPage";
import { StatisticsPage } from "./components/StatisticsPage";
import { AppLoadingScreen } from "./components/ui/AppLoadingScreen";
import { PracticeSetupPage } from "./components/practice/PracticeSetupPage";
import { PracticeRunnerPage } from "./components/practice/PracticeRunnerPage";
import { DeviceCheckPage } from "./components/testStart/DeviceCheckPage";
import { RulesAndToolsPage } from "./components/testStart/RulesAndToolsPage";
import { TestOverviewPage } from "./components/testStart/TestOverviewPage";
import { listQuestionSets } from "./lib/database";
import { useAppStore } from "./store/appStore";
import type { RouteKey } from "./types";

const NAV_ITEMS: Array<{ route: RouteKey; label: string }> = [
  { route: "home", label: "Home" },
  { route: "dashboard", label: "Dashboard" },
  { route: "import", label: "Import CSV" },
  { route: "sets", label: "Question Sets" },
  { route: "history", label: "Score History" },
  { route: "achievements", label: "Achievements" },
  { route: "mistakePractice", label: "Mistake Practice" },
  { route: "reviewList", label: "Review List" },
  { route: "statistics", label: "Statistics" },
  { route: "settings", label: "Settings" }
];

const MIN_LOADING_MS = 1200;

export default function App() {
  const { route, navigate, questionSets, setQuestionSets, dbError, setDbError } = useAppStore();
  const [bootLoading, setBootLoading] = useState(true);

  useEffect(() => {
    const startedAt = Date.now();
    listQuestionSets()
      .then((sets) => {
        setQuestionSets(sets);
        setDbError(null);
      })
      .catch((error: unknown) => {
        setDbError(formatError(error));
      })
      .finally(() => {
        const remaining = Math.max(0, MIN_LOADING_MS - (Date.now() - startedAt));
        window.setTimeout(() => setBootLoading(false), remaining);
      });
  }, [setDbError, setQuestionSets]);

  if (bootLoading) {
    return <AppLoadingScreen />;
  }

  if (route === "test") {
    return <TestRunnerPage />;
  }
  if (route === "practiceRunner") {
    return <PracticeRunnerPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-ink">
      <div className="app-shell-grid grid min-h-screen">
        <aside className="border-r border-line bg-white px-4 py-5">
          <button
            className="mb-8 text-left"
            onClick={() => navigate("home")}
            type="button"
          >
            <div className="text-lg font-semibold tracking-tight">SAT Practice Simulator</div>
            <div className="mt-1 text-xs font-medium text-muted">Local practice workspace</div>
          </button>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                  route === item.route
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-ink"
                }`}
                key={item.route}
                onClick={() => navigate(item.route)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-md border border-line bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase text-slate-500">Saved Sets</div>
            <div className="mt-2 text-2xl font-semibold">{questionSets.length}</div>
            <div className="mt-1 text-xs text-muted">Stored in local SQLite</div>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="border-b border-line bg-white px-8 py-5">
            <div className="app-content-shell flex items-center justify-between gap-6">
              <div>
                <h1 className="text-xl font-semibold">{titleForRoute(route)}</h1>
                <p className="mt-1 text-sm text-muted">Practice Score and Estimated Score only.</p>
              </div>
            </div>
          </header>

          {dbError ? (
            <div className="mx-8 mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {dbError}
            </div>
          ) : null}

          <div className="app-content-shell px-8 py-8">
            {route === "home" ? <HomeScreen /> : null}
            {route === "dashboard" ? <DashboardPage /> : null}
            {route === "import" ? <ImportScreen /> : null}
            {route === "sets" ? <QuestionSetsScreen /> : null}
            {route === "preview" ? <PreviewScreen /> : null}
            {route === "testOverview" ? <TestOverviewPage /> : null}
            {route === "rulesAndTools" ? <RulesAndToolsPage /> : null}
            {route === "deviceCheck" ? <DeviceCheckPage /> : null}
            {route === "setup" ? <TestSetupPage /> : null}
            {route === "moduleReview" ? <ModuleReviewPage /> : null}
            {route === "sectionBreak" ? <SectionBreakPage /> : null}
            {route === "result" ? <ResultPage /> : null}
            {route === "reviewAnswers" ? <ReviewAnswersPage /> : null}
            {route === "history" ? <ScoreHistoryPage /> : null}
            {route === "achievements" ? <AchievementsPage /> : null}
            {route === "mistakePractice" ? <PracticeSetupPage mode="mistake_practice" /> : null}
            {route === "reviewListPractice" ? <PracticeSetupPage mode="review_list_practice" /> : null}
            {route === "reviewList" ? <ReviewListPage /> : null}
            {route === "statistics" ? <StatisticsPage /> : null}
            {route === "settings" ? <SettingsScreen /> : null}
          </div>
        </main>
      </div>
    </div>
  );
}

function titleForRoute(route: RouteKey): string {
  const titles: Record<RouteKey, string> = {
    home: "Home",
    dashboard: "Dashboard",
    import: "Import CSV",
    sets: "Question Sets",
    preview: "Question Set Preview",
    testOverview: "Test Overview",
    rulesAndTools: "Rules and Tools",
    deviceCheck: "Device Check",
    setup: "Test Setup",
    test: "Practice Test",
    moduleReview: "Module Review",
    sectionBreak: "Section Break",
    result: "Result",
    reviewAnswers: "Review Answers",
    history: "Score History",
    achievements: "Achievements",
    mistakePractice: "Mistake Practice",
    reviewList: "Review List",
    reviewListPractice: "Review List Practice",
    statistics: "Statistics",
    practiceRunner: "Focused Practice",
    settings: "Settings"
  };
  return titles[route];
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected database error occurred.";
}
