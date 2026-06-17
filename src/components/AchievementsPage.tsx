import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { listAttemptHistory } from "../services/attemptService";
import { useAppStore } from "../store/appStore";
import type { AttemptSummary } from "../types";

type AchievementCategory = "Total" | "RW" | "Math";
type AchievementRank = "obsidian" | "gold" | "silver" | "bronze" | "black" | "white";

interface AchievementItem {
  id: string;
  category: AchievementCategory;
  score: number;
  rank: AchievementRank;
  completedAt: string;
  questionSetName: string;
}

type AchievementGroups = Record<AchievementCategory, AchievementItem[]>;

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  Total: "TOTAL",
  RW: "RW",
  Math: "MATH"
};

const RANK_COLORS: Record<
  AchievementRank,
  { start: string; end: string; accent: string; secondary: string; text: string; muted: string }
> = {
  obsidian: {
    start: "#24113f",
    end: "#3b1b63",
    accent: "#c4b5fd",
    secondary: "#8b5cf6",
    text: "#f8fafc",
    muted: "#c4b5fd"
  },
  gold: {
    start: "#7c4a03",
    end: "#facc15",
    accent: "#fde68a",
    secondary: "#f59e0b",
    text: "#ffffff",
    muted: "#fde68a"
  },
  silver: {
    start: "#475569",
    end: "#e2e8f0",
    accent: "#f8fafc",
    secondary: "#93c5fd",
    text: "#f8fafc",
    muted: "#e2e8f0"
  },
  bronze: {
    start: "#7c2d12",
    end: "#cd7f32",
    accent: "#fed7aa",
    secondary: "#fb923c",
    text: "#ffffff",
    muted: "#fed7aa"
  },
  black: {
    start: "#050505",
    end: "#18181b",
    accent: "#a1a1aa",
    secondary: "#71717a",
    text: "#ffffff",
    muted: "#a1a1aa"
  },
  white: {
    start: "#e2e8f0",
    end: "#ffffff",
    accent: "#2563eb",
    secondary: "#06b6d4",
    text: "#172234",
    muted: "#64748b"
  }
};

const INITIAL_EXPANDED: Record<AchievementCategory, boolean> = {
  Total: false,
  RW: false,
  Math: false
};

export function AchievementsPage() {
  const { setDbError } = useAppStore();
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<AchievementCategory, boolean>>(INITIAL_EXPANDED);
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null);

  useEffect(() => {
    setLoading(true);
    listAttemptHistory()
      .then((history) => {
        setAttempts(history);
        setDbError(null);
      })
      .catch((error: unknown) => {
        setDbError(error instanceof Error ? error.message : "Could not load achievements.");
      })
      .finally(() => setLoading(false));
  }, [setDbError]);

  const groups = useMemo(() => buildAchievementGroups(attempts), [attempts]);

  return (
    <section className="rounded-md border border-line bg-white shadow-panel">
      <div className="border-b border-line px-6 py-4">
        <h2 className="text-lg font-semibold">Achievements</h2>
        <p className="mt-1 text-sm text-muted">
          Score cards from completed local practice results.
        </p>
      </div>

      {loading ? <div className="p-6 text-sm text-muted">Loading achievements...</div> : null}

      {!loading && getTotalCardCount(groups) === 0 ? (
        <div className="p-8 text-center text-sm text-muted">
          Complete a practice session to unlock score cards.
        </div>
      ) : null}

      {!loading && getTotalCardCount(groups) > 0 ? (
        <div className="achievement-groups">
          {(["Total", "RW", "Math"] as AchievementCategory[]).map((category) => (
            <AchievementStack
              category={category}
              expanded={expanded[category]}
              items={groups[category]}
              key={category}
              onSelect={setSelectedAchievement}
              onToggle={() =>
                setExpanded((current) => ({
                  ...current,
                  [category]: !current[category]
                }))
              }
            />
          ))}
        </div>
      ) : null}

      {selectedAchievement ? (
        <div
          aria-modal="true"
          className="achievement-modal-backdrop"
          onClick={() => setSelectedAchievement(null)}
          role="dialog"
        >
          <div className="achievement-modal-content" onClick={(event) => event.stopPropagation()}>
            <button
              aria-label="Close achievement card"
              className="achievement-modal-close"
              onClick={() => setSelectedAchievement(null)}
              type="button"
            >
              ×
            </button>
            <AchievementCard enlarged item={selectedAchievement} />
            <AchievementShareWidget item={selectedAchievement} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AchievementStack({
  category,
  expanded,
  items,
  onSelect,
  onToggle
}: {
  category: AchievementCategory;
  expanded: boolean;
  items: AchievementItem[];
  onSelect: (item: AchievementItem) => void;
  onToggle: () => void;
}) {
  return (
    <section className="achievement-stack-panel">
      <div className="achievement-stack-header">
        <div>
          <h3 className="achievement-stack-title">{CATEGORY_LABELS[category]} Cards</h3>
          <p className="achievement-stack-subtitle">
            {items.length} saved result{items.length === 1 ? "" : "s"}
          </p>
        </div>
        <button
          className="bg-teal-700 px-4 py-2 text-sm font-semibold text-white"
          onClick={onToggle}
          type="button"
        >
          {expanded ? "Revert" : "Expand"}
        </button>
      </div>

      {items.length === 0 ? (
        <div className="achievement-empty">No completed {CATEGORY_LABELS[category]} score yet.</div>
      ) : (
        <div className="achievement-stack-stage">
          <div className={`achievement-card-strip ${expanded ? "is-expanded" : "is-stacked"}`}>
            {items.map((item) => (
              <AchievementCard item={item} key={item.id} onSelect={onSelect} />
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function AchievementCard({
  enlarged = false,
  item,
  onSelect
}: {
  enlarged?: boolean;
  item: AchievementItem;
  onSelect?: (item: AchievementItem) => void;
}) {
  const completed = formatCompletedAt(item.completedAt);
  const trackerCells = Array.from({ length: 25 }, (_, index) => index + 1);

  return (
    <div
      className={`achievement-card-shell achievement-rank-${item.rank} noselect ${
        enlarged ? "achievement-card-shell-enlarged" : ""
      }`}
      onClick={onSelect ? () => onSelect(item) : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                onSelect(item);
              }
            }
          : undefined
      }
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="achievement-canvas">
        {trackerCells.map((cell) => (
          <div className={`achievement-tr-${cell}`} key={cell} />
        ))}
      </div>
      <div className="achievement-card">
        <div className="achievement-card-content">
          <div className="achievement-title">{CATEGORY_LABELS[item.category]}</div>
          <div className="achievement-score">{item.score}</div>
          <div className="achievement-meta">
            <span>{completed.year}</span>
            <span>{completed.date}</span>
            <span>{completed.time}</span>
          </div>
          <div className="achievement-source">{item.questionSetName}</div>
          <div className="achievement-subtitle">
            Rank <span className="achievement-highlight">{item.rank}</span>
          </div>

          <div className="achievement-glowing-elements">
            <div className="achievement-glow-1" />
            <div className="achievement-glow-2" />
            <div className="achievement-glow-3" />
          </div>
          <div className="achievement-card-particles">
            <span />
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="achievement-card-glare" />
          <div className="achievement-cyber-lines">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="achievement-corner-elements">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div className="achievement-scan-line" />
        </div>
      </div>
    </div>
  );
}

function AchievementShareWidget({ item }: { item: AchievementItem }) {
  return (
    <div className="achievement-share-panel">
      <div className="achievement-share-title">Download achievement</div>
      <ul className="achievement-share-list example-1">
        <ShareButton
          label="Download"
          onClick={() => void downloadAchievementImage(item)}
          social="download"
        >
          <DownloadIcon />
        </ShareButton>
      </ul>
    </div>
  );
}

function ShareButton({
  children,
  label,
  onClick,
  social
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  social: string;
}) {
  return (
    <li className="icon-content">
      <button aria-label={label} className="link" data-social={social} onClick={onClick} type="button">
        <span className="tooltip">{label}</span>
        {children}
      </button>
    </li>
  );
}

function buildAchievementGroups(attempts: AttemptSummary[]): AchievementGroups {
  const completed = attempts
    .filter((attempt) => attempt.status === "completed")
    .sort((a, b) => getAttemptTime(b) - getAttemptTime(a));

  return {
    Total: completed.flatMap((attempt) => makeAchievementItem(attempt, "Total")),
    RW: completed.flatMap((attempt) => makeAchievementItem(attempt, "RW")),
    Math: completed.flatMap((attempt) => makeAchievementItem(attempt, "Math"))
  };
}

function makeAchievementItem(attempt: AttemptSummary, category: AchievementCategory): AchievementItem[] {
  const score =
    category === "Total"
      ? attempt.practiceScore
      : category === "RW"
        ? attempt.rwScore
        : attempt.mathScore;

  if (score === null || score === undefined) {
    return [];
  }

  return [
    {
      id: `${attempt.id}-${category}`,
      category,
      score,
      rank: getRank(score, category),
      completedAt: attempt.completedAt ?? attempt.startedAt,
      questionSetName: attempt.questionSetName
    }
  ];
}

function getRank(score: number, category: AchievementCategory): AchievementRank {
  const thresholds =
    category === "Total"
      ? [
          { min: 1550, rank: "obsidian" as const },
          { min: 1500, rank: "gold" as const },
          { min: 1400, rank: "silver" as const },
          { min: 1300, rank: "bronze" as const },
          { min: 1200, rank: "black" as const }
        ]
      : [
          { min: 775, rank: "obsidian" as const },
          { min: 750, rank: "gold" as const },
          { min: 700, rank: "silver" as const },
          { min: 650, rank: "bronze" as const },
          { min: 600, rank: "black" as const }
        ];

  return thresholds.find((threshold) => score >= threshold.min)?.rank ?? "white";
}

function getAttemptTime(attempt: AttemptSummary): number {
  return new Date(attempt.completedAt ?? attempt.startedAt).getTime();
}

function getTotalCardCount(groups: AchievementGroups): number {
  return groups.Total.length + groups.RW.length + groups.Math.length;
}

function formatCompletedAt(value: string): { year: string; date: string; time: string } {
  const date = new Date(value);
  return {
    year: new Intl.DateTimeFormat(undefined, { year: "numeric" }).format(date),
    date: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date),
    time: new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date)
  };
}

async function downloadAchievementImage(item: AchievementItem): Promise<void> {
  const blob = await createAchievementImageBlob(item);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildDownloadFilename(item);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function createAchievementImageBlob(item: AchievementItem): Promise<Blob> {
  const canvas = document.createElement("canvas");
  const width = 900;
  const height = 1203;
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("Could not create achievement image.");
  }

  const colors = RANK_COLORS[item.rank];
  const completed = formatCompletedAt(item.completedAt);
  const radius = 60;
  const inset = 24;
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, colors.start);
  gradient.addColorStop(1, colors.end);

  context.fillStyle = gradient;
  roundedRect(context, inset, inset, width - inset * 2, height - inset * 2, radius);
  context.fill();
  context.lineWidth = 8;
  context.strokeStyle = "rgba(255,255,255,0.72)";
  context.stroke();

  context.strokeStyle = colors.secondary;
  context.lineWidth = 6;
  drawCorners(context, inset + 38, inset + 38, width - inset * 2 - 76, height - inset * 2 - 76);

  context.fillStyle = colors.text;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.font = "900 190px Inter, system-ui, sans-serif";
  context.shadowColor = "rgba(0,0,0,0.35)";
  context.shadowBlur = 34;
  context.fillText(String(item.score), width / 2, 450);

  context.shadowBlur = 0;
  context.font = "800 50px Inter, system-ui, sans-serif";
  context.fillText(completed.year, width / 2, 620);
  context.font = "800 48px Inter, system-ui, sans-serif";
  context.fillText(completed.date, width / 2, 700);
  context.fillText(completed.time, width / 2, 780);

  context.fillStyle = colors.muted;
  context.font = "800 34px Inter, system-ui, sans-serif";
  drawWrappedText(context, item.questionSetName, width / 2, 940, 660, 42, 2);

  context.font = "700 42px Inter, system-ui, sans-serif";
  context.fillText("Rank", width / 2 - 58, 1060);
  context.fillStyle = colors.secondary;
  context.font = "900 42px Inter, system-ui, sans-serif";
  context.fillText(item.rank, width / 2 + 92, 1060);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.95));
  if (!blob) {
    throw new Error("Could not export achievement image.");
  }
  return blob;
}

function buildDownloadFilename(item: AchievementItem): string {
  const safeName = item.questionSetName.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").slice(0, 40);
  return `achievement-${CATEGORY_LABELS[item.category].toLowerCase()}-${item.score}-${safeName || "score"}.png`;
}

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.lineTo(x + width - radius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + radius);
  context.lineTo(x + width, y + height - radius);
  context.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  context.lineTo(x + radius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - radius);
  context.lineTo(x, y + radius);
  context.quadraticCurveTo(x, y, x + radius, y);
  context.closePath();
}

function drawCorners(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  const length = 56;
  context.beginPath();
  context.moveTo(x, y + length);
  context.lineTo(x, y);
  context.lineTo(x + length, y);
  context.moveTo(x + width - length, y);
  context.lineTo(x + width, y);
  context.lineTo(x + width, y + length);
  context.moveTo(x, y + height - length);
  context.lineTo(x, y + height);
  context.lineTo(x + length, y + height);
  context.moveTo(x + width - length, y + height);
  context.lineTo(x + width, y + height);
  context.lineTo(x + width, y + height - length);
  context.stroke();
}

function drawWrappedText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines: number
) {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (context.measureText(next).width <= maxWidth) {
      current = next;
      return;
    }
    if (current) {
      lines.push(current);
    }
    current = word;
  });
  if (current) {
    lines.push(current);
  }

  lines.slice(0, maxLines).forEach((line, index) => {
    const suffix = index === maxLines - 1 && lines.length > maxLines ? "..." : "";
    context.fillText(`${line}${suffix}`, x, y + index * lineHeight);
  });
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M11 3h2v10.2l3.3-3.3 1.4 1.4L12 17 6.3 11.3l1.4-1.4 3.3 3.3V3Zm-6 16h14v2H5v-2Z" />
    </svg>
  );
}
