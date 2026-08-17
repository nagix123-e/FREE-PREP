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
import { getKioskModeStatus, KIOSK_MODE_CHANGE_EVENT } from "./services/kioskModeService";
import { useAppStore } from "./store/appStore";
import type { RouteKey } from "./types";
import { SystemUiLocalizer, translate, tutorialFallback, useSystemLanguage } from "./i18n";
import type { SystemLanguage } from "./types";

const NAV_ITEMS: Array<{ route: RouteKey; labelKey: Parameters<typeof translate>[1] }> = [
  { route: "home", labelKey: "home" },
  { route: "dashboard", labelKey: "dashboard" },
  { route: "marketplace", labelKey: "marketplace" },
  { route: "import", labelKey: "importCsv" },
  { route: "sets", labelKey: "questionSets" },
  { route: "history", labelKey: "scoreHistory" },
  { route: "achievements", labelKey: "achievements" },
  { route: "spacedReview", labelKey: "spacedReview" },
  { route: "mistakePractice", labelKey: "mistakePractice" },
  { route: "domainPractice", labelKey: "domainPractice" },
  { route: "reviewList", labelKey: "reviewList" },
  { route: "statistics", labelKey: "statistics" },
  { route: "settings", labelKey: "settings" }
];

const MIN_LOADING_MS = 1200;

export default function App() {
  const { language, t } = useSystemLanguage();
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
    return <><KioskGestureGuard /><AppLoadingScreen /></>;
  }

  if (route === "test") {
    return (
      <>
        <KioskGestureGuard />
        {tutorial.active ? (
          <>
            <div className="tutorial-block-layer" aria-hidden="true" />
            <TutorialBanner language="en" onExit={exitTutorial} />
          </>
        ) : null}
        <TestRunnerPage />
      </>
    );
  }
  if (route === "practiceRunner") {
    return <><KioskGestureGuard /><PracticeRunnerPage /></>;
  }
  if (route === "teacherBuilder") {
    return <><KioskGestureGuard /><SystemUiLocalizer><TeacherBuilderPage /></SystemUiLocalizer></>;
  }

  return (
    <>
    <KioskGestureGuard />
    <SystemUiLocalizer>
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
              {language === "en" ? "Free Practice Simulator for the SAT® Exam" : "FREE PREP"}
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
                {t(item.labelKey)}
              </button>
            ))}
          </nav>

          <div className="mt-8 rounded-md border border-line bg-slate-50 p-3">
            <div className="text-xs font-semibold uppercase text-slate-500">{t("savedSets")}</div>
            <div className="mt-2 text-2xl font-semibold">{questionSets.length}</div>
            <div className="mt-1 text-xs text-muted">{t("storedInLocalSqlite")}</div>
          </div>
        </aside>

        <main className="min-w-0">
          <header className="border-b border-line bg-white px-8 py-5">
            <div className="app-content-shell flex items-center justify-between gap-6">
              <div>
                <h1 className="text-xl font-semibold">{titleForRoute(route, language)}</h1>
                <p className="mt-1 text-sm text-muted">{t("scoreDisclaimer")}</p>
              </div>
              {route === "home" ? (
                <div className="flex items-center gap-3">
                  <button
                    className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={startTutorial}
                    type="button"
                  >
                    {t("tutorial")}
                  </button>
                  <button
                    className="rounded-md border border-line bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => navigate("teacherBuilder")}
                    type="button"
                  >
                    {t("questionMakerConsole")}
                  </button>
                </div>
              ) : null}
            </div>
          </header>

          {tutorial.active ? (
            <>
              <div className="tutorial-block-layer" aria-hidden="true" />
              <TutorialBanner language={language} onExit={exitTutorial} />
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
    </SystemUiLocalizer>
    </>
  );
}

function KioskGestureGuard() {
  const [kioskActive, setKioskActive] = useState(false);

  useEffect(() => {
    let mounted = true;
    getKioskModeStatus().then((active) => {
      if (mounted) setKioskActive(active);
    }).catch(() => {
      if (mounted) setKioskActive(false);
    });

    const handleModeChange = (event: Event) => setKioskActive((event as CustomEvent<boolean>).detail);
    window.addEventListener(KIOSK_MODE_CHANGE_EVENT, handleModeChange);
    return () => {
      mounted = false;
      window.removeEventListener(KIOSK_MODE_CHANGE_EVENT, handleModeChange);
    };
  }, []);

  useEffect(() => {
    if (!kioskActive) return;

    const preventHorizontalNavigation = (event: WheelEvent) => {
      if (Math.abs(event.deltaX) > Math.abs(event.deltaY)) event.preventDefault();
    };
    const preventGestureNavigation = (event: Event) => event.preventDefault();
    const preventBrowserShortcuts = (event: KeyboardEvent) => {
      const browserNavigation = event.key === "BrowserBack" || event.key === "BrowserForward";
      const modifiedNavigation = (event.metaKey || event.ctrlKey) && ["[", "]", "ArrowLeft", "ArrowRight", "Tab"].includes(event.key);
      if (browserNavigation || modifiedNavigation) event.preventDefault();
    };

    window.addEventListener("wheel", preventHorizontalNavigation, { capture: true, passive: false });
    window.addEventListener("gesturestart", preventGestureNavigation, { capture: true });
    window.addEventListener("gesturechange", preventGestureNavigation, { capture: true });
    window.addEventListener("gestureend", preventGestureNavigation, { capture: true });
    window.addEventListener("keydown", preventBrowserShortcuts, { capture: true });
    return () => {
      window.removeEventListener("wheel", preventHorizontalNavigation, { capture: true });
      window.removeEventListener("gesturestart", preventGestureNavigation, { capture: true });
      window.removeEventListener("gesturechange", preventGestureNavigation, { capture: true });
      window.removeEventListener("gestureend", preventGestureNavigation, { capture: true });
      window.removeEventListener("keydown", preventBrowserShortcuts, { capture: true });
    };
  }, [kioskActive]);

  return null;
}

function TutorialBanner({ language, onExit }: { language: SystemLanguage; onExit: () => void }) {
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
          <div className="font-semibold">{translate(language, "tutorialMode", { step: stepIndex + 1, total: stepOrder.length })}</div>
          <div className="mt-1">{tutorialInstruction(language, tutorial.step)}</div>
        </div>
        <button
          className="rounded-md border border-teal-200 bg-white px-3 py-2 text-xs font-semibold text-teal-800 hover:bg-teal-100"
          onClick={onExit}
          type="button"
        >
          {translate(language, "exitTutorial")}
        </button>
      </div>
    </div>
  );
}

function tutorialInstruction(language: SystemLanguage, step: ReturnType<typeof useAppStore.getState>["tutorial"]["step"]): string {
  const keys = {
    home: "tutorialHome", dashboard: "tutorialDashboard", import_csv: "tutorialImport", marketplace_add: "tutorialMarketplace", question_sets: "tutorialQuestionSets", test_overview_continue: "tutorialOverview", rules_continue: "tutorialRules", device_check_confirm: "tutorialDeviceCheck", device_check_start: "tutorialStartModule", setup_start: "tutorialSetup", highlight: "tutorialHighlight", answer_one_rw: "tutorialAnswer", mark_review: "tutorialMark", notes: "tutorialNotes", shortcuts: "tutorialShortcuts", pause_exit: "tutorialPause", score_history_delete: "tutorialHistory", teacher_set_type: "tutorialTeacherSetType", teacher_test_id: "tutorialTeacherTestId", teacher_question: "tutorialTeacherQuestion", teacher_choice_a: "tutorialTeacherChoiceA", teacher_choice_b: "tutorialTeacherChoiceB", teacher_correct_answer: "tutorialTeacherCorrect", teacher_explanation: "tutorialTeacherExplanation", teacher_content_domain: "tutorialTeacherDomain", teacher_download: "tutorialTeacherDownload", teacher_done: "tutorialTeacherDone", done: "tutorialDone"
  } as const;
  return language === "en" ? translate(language, keys[step]) : tutorialFallback(language);
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

function titleForRoute(route: RouteKey, language: SystemLanguage): string {
  const titles: Record<RouteKey, Parameters<typeof translate>[1]> = {
    home: "home",
    teacherBuilder: "questionMakerConsole",
    marketplace: "marketplace",
    dashboard: "dashboard",
    import: "importCsv",
    sets: "questionSets",
    preview: "questionSetPreview",
    testOverview: "testOverview",
    rulesAndTools: "rulesAndTools",
    deviceCheck: "deviceCheck",
    setup: "testSetup",
    test: "practiceTest",
    moduleReview: "moduleReview",
    sectionBreak: "sectionBreak",
    result: "result",
    reviewAnswers: "reviewAnswers",
    history: "scoreHistory",
    achievements: "achievements",
    spacedReview: "spacedReview",
    mistakePractice: "mistakePractice",
    domainPractice: "domainPractice",
    reviewList: "reviewList",
    reviewListPractice: "reviewListPractice",
    statistics: "statistics",
    practiceRunner: "focusedPractice",
    settings: "settings"
  };
  return translate(language, titles[route]);
}

function formatError(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected database error occurred.";
}
