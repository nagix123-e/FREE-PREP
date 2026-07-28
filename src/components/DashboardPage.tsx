import html2canvas from "html2canvas";
import { useEffect, useRef, useState } from "react";
import { CategoryTrendChart } from "./charts/CategoryTrendChart";
import { SimpleLineChart } from "./charts/SimpleLineChart";
import type { LineSeries } from "./charts/SimpleLineChart";
import { getDashboardSummary } from "../services/dashboardService";
import { buildRecommendedPractice } from "../services/recommendationService";
import {
  getCategoryTrend,
  getScoreTrend,
  getWeaknessTrend,
  type CategoryTrendPoint,
  type ScoreTrendMode,
  type ScoreTrendPoint,
  type TrendFilter,
  type WeaknessTrend
} from "../services/trendService";
import type { DashboardSummary } from "../types";
import { BreakdownTable } from "./result/BreakdownTable";
import { DropdownSelect } from "./ui/DropdownSelect";

const DASHBOARD_EXPORT_WIDTH = 1280;
const DASHBOARD_EXPORT_MAX_DIMENSION = 8000;
const DASHBOARD_EXPORT_MAX_PIXELS = 14_000_000;

export function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [scoreTrend, setScoreTrend] = useState<ScoreTrendPoint[]>([]);
  const [domainTrend, setDomainTrend] = useState<CategoryTrendPoint[]>([]);
  const [skillTrend, setSkillTrend] = useState<CategoryTrendPoint[]>([]);
  const [weaknessTrend, setWeaknessTrend] = useState<WeaknessTrend | null>(null);
  const [trendFilter, setTrendFilter] = useState<TrendFilter>("last10");
  const [scoreMode, setScoreMode] = useState<ScoreTrendMode>("all");
  const [downloadState, setDownloadState] = useState<"idle" | "saving" | "done">("idle");
  const dashboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getDashboardSummary().then(setSummary).catch(() => setSummary(null));
  }, []);

  useEffect(() => {
    void Promise.all([
      getScoreTrend(trendFilter),
      getCategoryTrend("domain", trendFilter),
      getCategoryTrend("skill", trendFilter),
      getWeaknessTrend()
    ]).then(([scores, domains, skills, weakness]) => {
      setScoreTrend(scores);
      setDomainTrend(domains);
      setSkillTrend(skills);
      setWeaknessTrend(weakness);
    });
  }, [trendFilter]);

  if (!summary) {
    return <div className="text-sm text-muted">Loading dashboard...</div>;
  }

  async function downloadDashboardData() {
    const dashboard = dashboardRef.current;
    if (!dashboard || downloadState === "saving") return;
    setDownloadState("saving");
    let exportHost: HTMLDivElement | null = null;
    try {
      await waitForDashboardExportFonts();
      const exportRoot = dashboard.cloneNode(true) as HTMLDivElement;
      exportHost = prepareDashboardExportClone(exportRoot);
      await waitForDashboardExportLayout();

      const { width: exportWidth, height: exportHeight } = getDashboardExportBounds(exportRoot);
      const scale = getDashboardExportScale(exportWidth, exportHeight);
      const canvas = await html2canvas(exportRoot, {
        backgroundColor: "#f8fafc",
        logging: false,
        scale,
        scrollX: 0,
        scrollY: 0,
        useCORS: true,
        width: exportWidth,
        height: exportHeight,
        windowWidth: DASHBOARD_EXPORT_WIDTH,
        windowHeight: exportHeight
      });
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
      if (!blob) throw new Error("Dashboard image could not be created.");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "free-prep-dashboard.png";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 0);
      setDownloadState("done");
      window.setTimeout(() => setDownloadState("idle"), 2600);
    } catch {
      setDownloadState("idle");
    } finally {
      exportHost?.remove();
    }
  }

  return (
    <div className="space-y-7">
      {downloadState === "done" ? (
        <div className="download-confirmation-toast" role="status">
          <span className="download-confirmation-toast__check">✓</span>
          <span>
            Dashboard downloaded
            <span className="download-confirmation-toast__file">free-prep-dashboard.png</span>
          </span>
        </div>
      ) : null}
      <div className="flex justify-end">
        <button
          className={`rounded-full border border-line px-5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 ${downloadState === "done" ? "download-success-button text-white" : ""}`}
          disabled={downloadState === "saving"}
          onClick={downloadDashboardData}
          type="button"
        >
          {downloadState === "done" ? "Downloaded" : downloadState === "saving" ? "Preparing..." : "Download dashboard data"}
        </button>
      </div>
      <div className="space-y-7 bg-slate-50 p-1" ref={dashboardRef}>
        <div className="hidden rounded-md border border-line bg-white px-8 py-7" data-dashboard-export-header>
          <h2 className="text-2xl font-semibold">Dashboard</h2>
          <p className="mt-2 text-sm text-muted">Practice Score and Estimated Score only.</p>
        </div>
        <section className="grid grid-cols-4 gap-5">
          <Card label="Total Tests Taken" value={summary.totalTestsTaken.toString()} />
          <Card label="Average Practice Score" value={summary.averagePracticeScore.toString()} />
          <Card label="Best Practice Score" value={summary.bestPracticeScore.toString()} />
          <Card label="Review List Count" value={summary.reviewListCount.toString()} />
          <Card label="Average RW Score" value={summary.averageRwScore.toString()} />
          <Card label="Average Math Score" value={summary.averageMathScore.toString()} />
          <Card label="Total Questions Answered" value={summary.totalQuestionsAnswered.toString()} />
          <Card label="Total Study Time" value={formatDuration(summary.totalStudyTimeSec)} />
        </section>

        <section className="safe-card-padding rounded-md border border-line bg-white p-6 shadow-panel">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="font-semibold">Score Trend Chart</h3>
              <p className="mt-1 text-xs text-muted">Scores are estimates for practice only.</p>
            </div>
            <div className="grid min-w-[360px] grid-cols-2 gap-3">
              <DropdownSelect
                label="Range"
                onChange={(value) => setTrendFilter(value as TrendFilter)}
                options={[
                  { value: "last5", label: "Last 5 attempts" },
                  { value: "last10", label: "Last 10 attempts" },
                  { value: "last30days", label: "Last 30 days" },
                  { value: "all", label: "All time" }
                ]}
                value={trendFilter}
              />
              <DropdownSelect
                label="Score"
                onChange={(value) => setScoreMode(value as ScoreTrendMode)}
                options={[
                  { value: "total", label: "Total" },
                  { value: "rw", label: "RW" },
                  { value: "math", label: "Math" },
                  { value: "all", label: "Total + RW + Math" }
                ]}
                value={scoreMode}
              />
            </div>
          </div>
          <div className="mt-5">
            {scoreTrend.length === 0 ? (
              <p className="text-sm text-muted">No graph data yet. Complete a practice test to see score trends.</p>
            ) : (
              <SimpleLineChart
                max={scoreMode === "total" ? 1600 : scoreMode === "all" ? 1600 : 800}
                min={scoreMode === "total" ? 400 : scoreMode === "all" ? 200 : 200}
                series={buildScoreSeries(scoreTrend, scoreMode)}
                xLabels={scoreTrend.map((point) => point.label)}
              />
            )}
          </div>
        </section>

        <section className="grid grid-cols-2 gap-5">
          <CategoryTrendChart points={domainTrend} title="Domain Trend Chart" />
          <CategoryTrendChart points={skillTrend} title="Skill Trend Chart" />
        </section>

        <section className="grid grid-cols-2 gap-5">
          <WeaknessTrendPanel trend={weaknessTrend} />
          <section className="safe-card-padding rounded-md border border-line bg-white p-6 shadow-panel">
            <h3 className="font-semibold">Recommended Practice</h3>
            <div className="mt-5 space-y-3">
              {buildRecommendedPractice(summary.weakAreas).map((item) => (
                <div className="rounded-md border border-line bg-slate-50 p-4 text-sm" key={item}>{item}</div>
              ))}
            </div>
          </section>
        </section>

        <BreakdownTable rows={summary.weakAreas} title="Weak Areas" />
        <BreakdownTable rows={summary.strongAreas} title="Strong Areas" />
        <BreakdownTable
          labelHeader="Visual Type"
          rows={summary.visualPerformance}
          title="Visual Question Performance"
        />
      </div>
    </div>
  );
}

function prepareDashboardExportClone(exportRoot: HTMLDivElement): HTMLDivElement {
  const exportHost = document.createElement("div");
  exportHost.setAttribute("aria-hidden", "true");
  Object.assign(exportHost.style, {
    background: "#f8fafc",
    boxSizing: "border-box",
    left: "-100000px",
    pointerEvents: "none",
    position: "absolute",
    top: "0",
    width: `${DASHBOARD_EXPORT_WIDTH}px`
  });

  Object.assign(exportRoot.style, {
    boxSizing: "border-box",
    maxWidth: "none",
    overflow: "visible",
    width: `${DASHBOARD_EXPORT_WIDTH}px`
  });

  const exportHeader = exportRoot.querySelector<HTMLElement>("[data-dashboard-export-header]");
  if (exportHeader) {
    exportHeader.classList.remove("hidden");
    exportHeader.style.display = "block";
  }

  exportRoot.querySelectorAll<HTMLElement>(".overflow-auto, .safe-table-card").forEach((element) => {
    element.style.overflow = "visible";
    element.style.maxHeight = "none";
  });
  exportRoot.querySelectorAll<SVGElement>("svg").forEach((svg) => {
    svg.style.display = "block";
    svg.style.maxWidth = "none";
    svg.style.overflow = "visible";
    svg.style.width = "100%";
  });

  exportHost.appendChild(exportRoot);
  document.body.appendChild(exportHost);
  return exportHost;
}

async function waitForDashboardExportLayout(): Promise<void> {
  await new Promise<void>((resolve) => window.setTimeout(resolve, 80));
}

async function waitForDashboardExportFonts(): Promise<void> {
  await Promise.race([
    document.fonts.ready.then(() => undefined),
    new Promise<void>((resolve) => window.setTimeout(resolve, 1000))
  ]);
}

function getDashboardExportBounds(exportRoot: HTMLDivElement): { width: number; height: number } {
  const rootRect = exportRoot.getBoundingClientRect();
  let contentHeight = exportRoot.scrollHeight;

  const finalTableSection = exportRoot.querySelector<HTMLElement>(".safe-table-card:last-child");
  const finalTable = finalTableSection?.querySelector<HTMLTableElement>("table");
  if (finalTable) {
    const finalTableBottom = finalTable.getBoundingClientRect().bottom - rootRect.top;
    contentHeight = Math.max(contentHeight, finalTableBottom);
  }

  return {
    width: Math.ceil(exportRoot.scrollWidth),
    height: Math.ceil(contentHeight) + 24
  };
}

function getDashboardExportScale(width: number, height: number): number {
  const deviceScale = Math.min(2, window.devicePixelRatio || 1);
  const dimensionScale = Math.min(
    DASHBOARD_EXPORT_MAX_DIMENSION / Math.max(1, width),
    DASHBOARD_EXPORT_MAX_DIMENSION / Math.max(1, height)
  );
  const pixelScale = Math.sqrt(DASHBOARD_EXPORT_MAX_PIXELS / Math.max(1, width * height));
  return Math.max(1, Math.min(deviceScale, dimensionScale, pixelScale));
}

function buildScoreSeries(points: ScoreTrendPoint[], mode: ScoreTrendMode): LineSeries[] {
  const series: LineSeries[] = [];
  if (mode === "total" || mode === "all") {
    series.push({ key: "total", label: "Total Practice Score", color: "#0f766e", values: points.map((point) => point.total) });
  }
  if (mode === "rw" || mode === "all") {
    series.push({ key: "rw", label: "RW Practice Score", color: "#2563eb", values: points.map((point) => point.rw) });
  }
  if (mode === "math" || mode === "all") {
    series.push({ key: "math", label: "Math Practice Score", color: "#db2777", values: points.map((point) => point.math) });
  }
  return series;
}

function WeaknessTrendPanel({ trend }: { trend: WeaknessTrend | null }) {
  return (
    <section className="safe-card-padding rounded-md border border-line bg-white p-6 shadow-panel">
      <h3 className="font-semibold">Weakness Trend</h3>
      {!trend ? <p className="mt-4 text-sm text-muted">No weakness trend data yet.</p> : null}
      {trend ? (
        <div className="mt-5 grid grid-cols-2 gap-4 text-sm">
          <TrendList title="Weak Areas Now" values={trend.weakAreasNow} />
          <TrendList title="Improved Areas" values={trend.improvedAreas} />
          <TrendList title="Declining Areas" values={trend.decliningAreas} />
          <TrendList title="Most Missed Topics" values={trend.mostMissedTopics} />
        </div>
      ) : null}
    </section>
  );
}

function TrendList({ title, values }: { title: string; values: string[] }) {
  return (
    <div className="rounded-md border border-line bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase text-slate-500">{title}</div>
      <div className="mt-2 space-y-1">
        {values.length === 0 ? <div className="text-xs text-muted">No data</div> : null}
        {values.map((value) => <div key={value}>{value}</div>)}
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="safe-card-padding rounded-md border border-line bg-white p-6 shadow-panel">
      <div className="text-2xl font-semibold">{value}</div>
      <div className="mt-1 text-xs font-semibold uppercase text-slate-500">{label}</div>
    </div>
  );
}

function TrendPanel({ title, values }: { title: string; values: number[] }) {
  const max = Math.max(...values, 1);
  return (
    <div className="safe-card-padding rounded-md border border-line bg-white p-6 shadow-panel">
      <h3 className="font-semibold">{title}</h3>
      <div className="mt-4 flex h-24 items-end gap-2">
        {values.length === 0 ? <div className="text-sm text-muted">No data</div> : null}
        {values.map((value, index) => (
          <div className="flex flex-1 flex-col items-center gap-2" key={`${value}-${index}`}>
            <div className="w-full rounded-t bg-teal-600" style={{ height: `${Math.max(8, (value / max) * 88)}px` }} />
            <div className="text-xs text-muted">{value || "-"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainder = seconds % 60;
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${remainder}s`;
  }
  return `${remainder}s`;
}
