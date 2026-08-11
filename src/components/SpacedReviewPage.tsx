import { useEffect, useState } from "react";
import { listDueSpacedReviewItems, getSpacedReviewSummary, SPACED_REVIEW_SESSION_LIMIT, type SpacedReviewSummary } from "../services/spacedReviewService";
import { useAppStore } from "../store/appStore";
import { usePracticeStore } from "../store/practiceStore";
import { useSystemLanguage } from "../i18n";

export function SpacedReviewPage() {
  const { language, t } = useSystemLanguage();
  const { navigate, setDbError } = useAppStore();
  const startPractice = usePracticeStore((state) => state.startPractice);
  const [summary, setSummary] = useState<SpacedReviewSummary | null>(null);
  const [starting, setStarting] = useState(false);

  useEffect(() => {
    void loadSummary();
  }, []);

  async function loadSummary() {
    try {
      setSummary(await getSpacedReviewSummary());
      setDbError(null);
    } catch (error: unknown) {
      setDbError(error instanceof Error ? error.message : "Could not load spaced review.");
      setSummary(null);
    }
  }

  async function startReview() {
    setStarting(true);
    try {
      const dueQuestions = await listDueSpacedReviewItems(1);
      const firstQuestion = dueQuestions[0];
      if (!firstQuestion?.questionSetId) {
        await loadSummary();
        return;
      }
      const attemptId = await startPractice({
        questionSetId: firstQuestion.questionSetId,
        mode: "spaced_review",
        questionCount: SPACED_REVIEW_SESSION_LIMIT,
        randomize: false,
        timerEnabled: false
      });
      navigate("practiceRunner", firstQuestion.questionSetId, attemptId);
    } catch (error: unknown) {
      setDbError(error instanceof Error ? error.message : "Could not start spaced review.");
      await loadSummary();
    } finally {
      setStarting(false);
    }
  }

  if (!summary) {
    return <div className="text-sm text-muted">{t("spacedReviewLoading")}</div>;
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h2 className="text-2xl font-semibold">{t("spacedReview")}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Review past mistakes at increasing intervals to strengthen retention.
        </p>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          <Metric label={t("dueNow")} value={summary.dueNow.toString()} />
          <Metric label={t("upcoming")} value={summary.upcoming.toString()} />
          <Metric label={t("totalScheduled")} value={summary.totalScheduled.toString()} />
        </div>

        {summary.dueNow > 0 ? (
          <div className="mt-6 rounded-md border border-teal-200 bg-teal-50 p-5">
            <div className="text-lg font-semibold">{summary.dueNow} question{summary.dueNow === 1 ? "" : "s"} due</div>
            <p className="mt-1 text-sm text-teal-900">
              Each session includes up to {SPACED_REVIEW_SESSION_LIMIT} questions, oldest due first.
            </p>
            <button
              className="mt-4 rounded-md bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              disabled={starting}
              onClick={() => void startReview()}
              type="button"
            >
              {starting ? t("loading") : t("startReview")}
            </button>
          </div>
        ) : (
          <div className="mt-6 rounded-md border border-line bg-slate-50 p-5">
            <div className="text-lg font-semibold">{t("caughtUp")}</div>
            <p className="mt-1 text-sm text-slate-600">
              {summary.upcoming > 0 && summary.nextDueAt
                ? `${summary.upcoming} ${t("questions").toLowerCase()} · ${formatDate(summary.nextDueAt)}`
                : language === "ja" ? "新しく間違えた問題は翌日に復習予定へ追加されます。" : "Newly missed questions are scheduled for review tomorrow."}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h3 className="text-base font-semibold">{t("reviewIntervals")}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          A correct review moves to 3, 7, 14, then 30 days. An incorrect review resets to tomorrow.
        </p>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-4">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase text-slate-500">{label}</div>
    </div>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
