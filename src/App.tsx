import { useEffect, useState } from "react";
import { HomeScreen } from "./components/HomeScreen";
import { DashboardPage } from "./components/DashboardPage";
import { ImportScreen } from "./components/ImportScreen";
import { MarketplacePage } from "./components/MarketplacePage";
import { ModuleReviewPage } from "./components/ModuleReviewPage";
import { PreviewScreen } from "./components/PreviewScreen";
import { QuestionSetsScreen } from "./components/QuestionSetsScreen";
import { ResultPage } from "./components/ResultPage";
import { ReviewAnswersPage } from "./components/ReviewAnswersPage";
import { ReviewListPage } from "./components/ReviewListPage";
import { ScoreHistoryPage } from "./components/ScoreHistoryPage";
import { AchievementsPage } from "./components/AchievementsPage";
import { SpacedReviewPage } from "./components/SpacedReviewPage";
import { SectionBreakPage } from "./components/SectionBreakPage";
import { SettingsScreen } from "./components/SettingsScreen";
import { TestRunnerPage } from "./components/TestRunnerPage";
import { TestSetupPage } from "./components/TestSetupPage";
import { StatisticsPage } from "./components/StatisticsPage";
import { TeacherBuilderPage } from "./components/TeacherBuilderPage";
import { AppLoadingScreen } from "./components/ui/AppLoadingScreen";
import { Shuffle } from "./components/ui/Shuffle";
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
  { route: "marketplace", label: "Marketplace" },
  { route: "import", label: "Import CSV" },
  { route: "sets", label: "Question Sets" },
  { route: "history", label: "Score History" },
  { route: "achievements", label: "Achievements" },
  { route: "spacedReview", label: "Spaced Review" },
  { route: "mistakePractice", label: "Mistake Practice" },
  { route: "domainPractice", label: "Domain Practice" },
  { route: "reviewList", label: "Review List" },
  { route: "statistics", label: "Statistics" },
  { route: "settings", label: "Settings" }
];

const MIN_LOADING_MS = 1200;

export default function App() {
  const {
    route,
    navigate,
    questionSets,
    setQuestionSets,
    dbError,
    setDbError,
    tutorial,
    startTutorial,
    exitTutorial,
    setTutorialStep
  } = useAppStore();
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

  useEffect(() => {
    if (!tutorial.active) return;
    if (tutorial.step === "home" && route === "dashboard") setTutorialStep("dashboard");
    if (tutorial.step === "dashboard" && route === "import") setTutorialStep("import_csv");
    if (tutorial.step === "import_csv" && route === "marketplace") setTutorialStep("marketplace_add");
  }, [route, setTutorialStep, tutorial.active, tutorial.step]);

  if (bootLoading) {
    return <AppLoadingScreen />;
  }

  if (route === "test") {
    return (
      <>
        {tutorial.active ? (
          <>
            <div className="tutorial-block-layer" aria-hidden="true" />
            <TutorialBanner onExit={exitTutorial} />
          </>
        ) : null}
        <TestRunnerPage />
      </>
    );
  }
  if (route === "practiceRunner") {
    return <PracticeRunnerPage />;
  }
  if (route === "teacherBuilder") {
    return <TeacherBuilderPage />;
  }

  return (
    <div className="min-h-screen bg-slate-50 text-ink">
      <div className="app-shell-grid grid min-h-screen">
        <aside className="border-r border-line bg-white px-4 py-5">
          <button
            className="brand-lockup mb-8 text-left"
            onClick={() => navigate("home")}
            type="button"
          >
            <div className="brand-title">
              <Shuffle
                animationMode="evenodd"
                duration={0.35}
                easterEggEvery={15}
                easterEggWords={[
                  "FLEE GREG",
                  "TREE STICK",
                  "SKII STICK",
                  "FLEA PREP",
                  "KNEE BREAK",
                  "GLEE SLIP",
                  "STAR TREK"
                ]}
                loop
                loopDelay={15}
                respectReducedMotion
                shuffleDirection="right"
                shuffleTimes={1}
                stagger={0.03}
                text="FREE PREP"
                threshold={0.1}
                triggerOnce={false}
              />
            </div>
            <div className="brand-subtitle">
              Free Practice Simulator for the SAT® Exam
            </div>
            <div className="brand-disclaimer">
              Not affiliated with or endorsed by College Board.
            </div>
          </button>

          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <button
                className={`w-full rounded-md px-3 py-2 text-left text-sm font-medium transition ${
                  route === item.route
                    ? "bg-teal-50 text-teal-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-ink"
                } ${tutorialNavTargetClass(tutorial, item.route)}`}
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
              {route === "home" ? (
                <div className="flex items-center gap-3">
                  <button
                    className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={startTutorial}
                    type="button"
                  >
                    Tutorial
                  </button>
                  <button
                    className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => navigate("teacherBuilder")}
                    type="button"
                  >
                    Question Maker Console
                  </button>
                </div>
              ) : null}
            </div>
          </header>

          {tutorial.active ? (
            <>
              <div className="tutorial-block-layer" aria-hidden="true" />
              <TutorialBanner onExit={exitTutorial} />
            </>
          ) : null}

          {dbError ? (
            <div className="mx-8 mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              {dbError}
            </div>
          ) : null}

          <div className="app-content-shell px-8 py-8">
            {route === "home" ? <HomeScreen /> : null}
            {route === "dashboard" ? <DashboardPage /> : null}
            {route === "marketplace" ? <MarketplacePage /> : null}
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
            {route === "spacedReview" ? <SpacedReviewPage /> : null}
            {route === "mistakePractice" ? <PracticeSetupPage mode="mistake_practice" /> : null}
            {route === "domainPractice" ? <PracticeSetupPage mode="domain_practice" /> : null}
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

function TutorialBanner({ onExit }: { onExit: () => void }) {
  const tutorial = useAppStore((state) => state.tutorial);
  const stepOrder: Array<typeof tutorial.step> = [
    "home",
    "dashboard",
    "import_csv",
    "marketplace_add",
    "question_sets",
    "test_overview_continue",
    "rules_continue",
    "device_check_confirm",
    "device_check_start",
    "setup_start",
    "highlight",
    "answer_one_rw",
    "mark_review",
    "notes",
    "shortcuts",
    "pause_exit",
    "score_history_delete",
    "teacher_set_type",
    "teacher_test_id",
    "teacher_question",
    "teacher_choice_a",
    "teacher_choice_b",
    "teacher_correct_answer",
    "teacher_explanation",
    "teacher_content_domain",
    "teacher_download",
    "teacher_done",
    "done"
  ];
  const stepIndex = Math.max(0, stepOrder.indexOf(tutorial.step));
  return (
    <div className="tutorial-banner mx-8 mt-6 rounded-md border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-semibold">Tutorial Mode · Step {stepIndex + 1}/{stepOrder.length}</div>
          <div className="mt-1">{tutorialInstruction(tutorial.step)}</div>
        </div>
        <button
          className="rounded-md border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100"
          onClick={onExit}
          type="button"
        >
          Exit Tutorial
        </button>
      </div>
    </div>
  );
}

function tutorialInstruction(step: ReturnType<typeof useAppStore.getState>["tutorial"]["step"]): string {
  const text = {
    home: "This is Home. Click Dashboard to see your practice overview.",
    dashboard: "This is Dashboard. Next, go to Import CSV.",
    import_csv: "This is Import CSV. Next, open Marketplace.",
    marketplace_add: "Add the first marketplace question set directly to your local library.",
    question_sets: "Find the set you imported and start RW practice.",
    test_overview_continue: "Press Continue to move through the test overview.",
    rules_continue: "Press Continue after reviewing the rules and tools.",
    device_check_confirm: "Confirm the local device check.",
    device_check_start: "Press Start Module.",
    setup_start: "Start RW practice.",
    highlight: "Press Highlight.",
    answer_one_rw: "Answer one RW question.",
    mark_review: "Press Mark for Review.",
    notes: "Open Notes.",
    shortcuts: "Open Shortcuts to see keyboard controls.",
    pause_exit: "Open Pause, then click Exit to Home.",
    score_history_delete: "Go to Score History and delete the tutorial practice history.",
    teacher_set_type: "Choose the question set type.",
    teacher_test_id: "Enter a Test ID.",
    teacher_question: "Write the question prompt.",
    teacher_choice_a: "Write choice A.",
    teacher_choice_b: "Write choice B.",
    teacher_correct_answer: "Choose the correct answer.",
    teacher_explanation: "Write the explanation.",
    teacher_content_domain: "Choose the content domain.",
    teacher_download: "Download the CSV.",
    teacher_done: "Question maker tutorial complete.",
    done: "Tutorial complete."
  };
  return text[step];
}

function tutorialNavTargetClass(
  tutorial: ReturnType<typeof useAppStore.getState>["tutorial"],
  route: RouteKey
): string {
  if (!tutorial.active) return "";
  if (tutorial.step === "home" && route === "dashboard") return "tutorial-active-target tutorial-target-ring";
  if (tutorial.step === "dashboard" && route === "import") return "tutorial-active-target tutorial-target-ring";
  if (tutorial.step === "import_csv" && route === "marketplace") return "tutorial-active-target tutorial-target-ring";
  if (tutorial.step === "question_sets" && route === "sets") return "tutorial-active-target tutorial-target-ring";
  if (tutorial.step === "score_history_delete" && route === "history") return "tutorial-active-target tutorial-target-ring";
  return "";
}

function titleForRoute(route: RouteKey): string {
  const titles: Record<RouteKey, string> = {
    home: "Home",
    teacherBuilder: "Question Maker Console",
    marketplace: "Marketplace",
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
    spacedReview: "Spaced Review",
    mistakePractice: "Mistake Practice",
    domainPractice: "Domain Practice",
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
