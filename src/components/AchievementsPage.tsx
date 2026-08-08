import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { loadSettings } from "../services/settingsService";
import { listAttemptHistory } from "../services/attemptService";
import { getScoreResult } from "../services/scoringService";
import { useAppStore } from "../store/appStore";
import type { AttemptSummary, BreakdownRow, ScoreResult } from "../types";

type AchievementCategory = "Total" | "RW" | "Math";
type AchievementRank = "obsidian" | "gold" | "silver" | "bronze" | "black" | "white";
type BadgeTier = "blue" | "yellow" | "pink" | "purple";

interface AchievementItem {
  id: string;
  category: AchievementCategory;
  score: number;
  rank: AchievementRank;
  completedAt: string;
  questionSetName: string;
}

type AchievementGroups = Record<AchievementCategory, AchievementItem[]>;

interface BadgeItem {
  id: string;
  title: string;
  value: string;
  tier: BadgeTier;
}

interface AchievementProgress {
  xp: number;
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  percent: number;
}

interface AchievementSnapshot {
  badgeIds: string[];
  cardIds: string[];
  xp: number;
  level: number;
  percent: number;
}

interface AchievementAnimationState {
  changedXp: boolean;
  newBadgeIds: Set<string>;
  newCardIds: Set<string>;
  previousPercent: number;
}

interface AchievementLevelTracker {
  latestAttemptId: number;
  level: number;
  percent: number;
}

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

const ACHIEVEMENT_SNAPSHOT_KEY = "sat-practice-simulator-achievement-snapshot";
const ACHIEVEMENT_CONSUMED_LEVEL_UP_KEY = "sat-practice-simulator-consumed-level-up";
const ACHIEVEMENT_LEVEL_TRACKER_KEY = "sat-practice-simulator-level-tracker";
const ACHIEVEMENT_CLICK_SOUND_SRC = "/audio/card-badge.mp3";
const ACHIEVEMENT_CLICK_SOUND_START_SECONDS = 0.2;
const ACHIEVEMENT_CLICK_SOUND_END_SECONDS = 3;
const ACHIEVEMENT_XP_SOUND_SRC = "/audio/xp-level-up.mp3";
const ACHIEVEMENT_LEVEL_TRANSITION_SOUND_SRC = "/audio/xp-level-transition.mp3";
const ACHIEVEMENT_XP_BAR_ANIMATION_MS = 2000;

let achievementAudioContext: AudioContext | null = null;
let achievementClickBuffer: AudioBuffer | null = null;
let achievementXpBuffer: AudioBuffer | null = null;
let achievementLevelTransitionBuffer: AudioBuffer | null = null;
let achievementClickBufferPromise: Promise<AudioBuffer | null> | null = null;
let achievementXpBufferPromise: Promise<AudioBuffer | null> | null = null;
let achievementLevelTransitionBufferPromise: Promise<AudioBuffer | null> | null = null;
const activeAchievementClickSounds = new Set<HTMLAudioElement>();

const EMPTY_ANIMATION_STATE: AchievementAnimationState = {
  changedXp: false,
  newBadgeIds: new Set<string>(),
  newCardIds: new Set<string>(),
  previousPercent: 0
};

function playAchievementClickSound(audioEnabled: boolean) {
  if (!audioEnabled) return;
  playHtmlAchievementClickFallback();
}

function playAchievementXpSound(audioEnabled: boolean) {
  if (!audioEnabled) return;
  void playBufferedAchievementSound("xp", 0.72, 0);
}

function playAchievementLevelTransitionSound(audioEnabled: boolean) {
  if (!audioEnabled) return;
  void playBufferedAchievementSound("level-transition", 0.76, 0);
}

function preloadAchievementSounds(audioEnabled: boolean) {
  if (!audioEnabled) return;
  void loadAchievementSoundBuffer("click");
  void loadAchievementSoundBuffer("xp");
  void loadAchievementSoundBuffer("level-transition");
}

function getAchievementAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AudioContextConstructor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextConstructor) return null;
  achievementAudioContext = achievementAudioContext ?? new AudioContextConstructor();
  return achievementAudioContext;
}

async function loadAchievementSoundBuffer(kind: "click" | "xp" | "level-transition"): Promise<AudioBuffer | null> {
  const existing =
    kind === "click"
      ? achievementClickBuffer
      : kind === "xp"
        ? achievementXpBuffer
        : achievementLevelTransitionBuffer;
  if (existing) return existing;

  const existingPromise =
    kind === "click"
      ? achievementClickBufferPromise
      : kind === "xp"
        ? achievementXpBufferPromise
        : achievementLevelTransitionBufferPromise;
  if (existingPromise) return existingPromise;

  const context = getAchievementAudioContext();
  if (!context) return null;

  const source =
    kind === "click"
      ? ACHIEVEMENT_CLICK_SOUND_SRC
      : kind === "xp"
        ? ACHIEVEMENT_XP_SOUND_SRC
        : ACHIEVEMENT_LEVEL_TRANSITION_SOUND_SRC;
  const promise = fetch(source)
    .then((response) => response.arrayBuffer())
    .then((arrayBuffer) => context.decodeAudioData(arrayBuffer))
    .then((buffer) => {
      if (kind === "click") {
        achievementClickBuffer = buffer;
      } else if (kind === "xp") {
        achievementXpBuffer = buffer;
      } else {
        achievementLevelTransitionBuffer = buffer;
      }
      return buffer;
    })
    .catch(() => null);

  if (kind === "click") {
    achievementClickBufferPromise = promise;
  } else if (kind === "xp") {
    achievementXpBufferPromise = promise;
  } else {
    achievementLevelTransitionBufferPromise = promise;
  }
  return promise;
}

async function playBufferedAchievementSound(
  kind: "click" | "xp" | "level-transition",
  volume: number,
  startAt: number,
  endAt?: number
): Promise<boolean> {
  const context = getAchievementAudioContext();
  if (!context) return false;
  if (context.state === "suspended") {
    await context.resume().catch(() => undefined);
  }
  if (context.state === "suspended") return false;

  const buffer = await loadAchievementSoundBuffer(kind);
  if (!buffer) return false;

  const offset = Math.min(startAt, Math.max(0, buffer.duration - 0.01));
  const duration = endAt === undefined ? undefined : Math.max(0.01, Math.min(endAt, buffer.duration) - offset);
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(context.destination);
  source.start(0, offset, duration);
  return true;
}

function playHtmlAchievementClickFallback() {
  if (typeof Audio === "undefined") return;

  const audio = new Audio(ACHIEVEMENT_CLICK_SOUND_SRC);
  audio.preload = "auto";
  audio.volume = 0.62;
  activeAchievementClickSounds.add(audio);
  try {
    audio.currentTime = ACHIEVEMENT_CLICK_SOUND_START_SECONDS;
  } catch {
    // Some WebViews reject seeking before metadata is ready; playback still starts as soon as possible.
  }
  const cleanup = () => {
    window.clearTimeout(stopTimer);
    activeAchievementClickSounds.delete(audio);
  };
  const stopTimer = window.setTimeout(() => {
    audio.pause();
    cleanup();
  }, (ACHIEVEMENT_CLICK_SOUND_END_SECONDS - ACHIEVEMENT_CLICK_SOUND_START_SECONDS) * 1000);
  audio.addEventListener("ended", cleanup, { once: true });
  void audio.play().catch(cleanup);
}

export function AchievementsPage() {
  const { setDbError } = useAppStore();
  const [attempts, setAttempts] = useState<AttemptSummary[]>([]);
  const [scoreResults, setScoreResults] = useState<ScoreResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<Record<AchievementCategory, boolean>>(INITIAL_EXPANDED);
  const [badgesExpanded, setBadgesExpanded] = useState(false);
  const [animationState, setAnimationState] = useState<AchievementAnimationState>(EMPTY_ANIMATION_STATE);
  const [animatedProgressPercent, setAnimatedProgressPercent] = useState<number | null>(null);
  const [animatedProgressLevel, setAnimatedProgressLevel] = useState<number | null>(null);
  const [progressAnimationPhase, setProgressAnimationPhase] = useState<"idle" | "fill" | "reset" | "grow">("idle");
  const [selectedAchievement, setSelectedAchievement] = useState<AchievementItem | null>(null);
  const [selectedBadge, setSelectedBadge] = useState<BadgeItem | null>(null);
  const [badgeMotionLite, setBadgeMotionLite] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(false);
  const [scoreCardName, setScoreCardName] = useState("");
  const processedSnapshotKeyRef = useRef<string | null>(null);

  useEffect(() => {
    loadSettings()
      .then((settings) => {
        setAudioEnabled(settings.audioEnabled);
        setScoreCardName(settings.scoreCardName.trim());
        preloadAchievementSounds(settings.audioEnabled);
      })
      .catch(() => {
        setAudioEnabled(true);
        setScoreCardName("");
      });
  }, []);

  useEffect(() => {
    if (!selectedBadge) return;
    setBadgeMotionLite(true);
    const timeoutId = window.setTimeout(() => setBadgeMotionLite(false), 520);
    return () => window.clearTimeout(timeoutId);
  }, [selectedBadge]);

  useEffect(() => {
    setLoading(true);
    listAttemptHistory()
      .then((history) => {
        setAttempts(history);
        setDbError(null);
        return Promise.all(
          history
            .filter((attempt) => attempt.status === "completed" && attempt.id > 0)
            .map((attempt) => getScoreResult(attempt.id).catch(() => null))
        );
      })
      .then((results) => {
        setScoreResults(results.filter((result): result is ScoreResult => result !== null));
        setDbError(null);
      })
      .catch((error: unknown) => {
        setDbError(error instanceof Error ? error.message : "Could not load achievements.");
      })
      .finally(() => setLoading(false));
  }, [setDbError]);

  const groups = useMemo(() => buildAchievementGroups(attempts), [attempts]);
  const badges = useMemo(() => buildBadges(attempts, scoreResults), [attempts, scoreResults]);
  const progress = useMemo(() => buildProgress(attempts), [attempts]);
  const hasAnyAchievement = getTotalCardCount(groups) > 0 || badges.length > 0;
  const allCardIds = useMemo(() => getAllCardIds(groups), [groups]);

  useEffect(() => {
    if (loading || !hasAnyAchievement) return;

    const snapshot = buildAchievementSnapshot(progress, badges, allCardIds);
    const snapshotKey = getAchievementSnapshotKey(snapshot);
    const previous = readAchievementSnapshot();
    const latestAttemptId = getLatestCompletedAttemptId(attempts);
    const previousProgress = buildProgressBeforeLatestAttempt(attempts, latestAttemptId);
    const previousLevelTracker = readAchievementLevelTracker();
    if (!previous) {
      writeAchievementSnapshot(snapshot);
      writeAchievementLevelTracker({ latestAttemptId, level: progress.level, percent: progress.percent });
      processedSnapshotKeyRef.current = snapshotKey;
      setAnimationState(EMPTY_ANIMATION_STATE);
      setAnimatedProgressPercent(progress.percent);
      setAnimatedProgressLevel(progress.level);
      setProgressAnimationPhase("idle");
      return;
    }

    if (processedSnapshotKeyRef.current === snapshotKey) {
      setAnimationState(EMPTY_ANIMATION_STATE);
      setAnimatedProgressPercent(progress.percent);
      setAnimatedProgressLevel(progress.level);
      setProgressAnimationPhase("idle");
      return;
    }

    if (!previousLevelTracker) {
      writeAchievementLevelTracker({ latestAttemptId, level: progress.level, percent: progress.percent });
      writeAchievementSnapshot(snapshot);
      processedSnapshotKeyRef.current = snapshotKey;
      setAnimationState(EMPTY_ANIMATION_STATE);
      setAnimatedProgressPercent(progress.percent);
      setAnimatedProgressLevel(progress.level);
      setProgressAnimationPhase("idle");
      return;
    }

    const newBadgeIds = snapshot.badgeIds.filter((id) => !previous.badgeIds.includes(id));
    const newCardIds = snapshot.cardIds.filter((id) => !previous.cardIds.includes(id));
    const levelUpEventKey = getLevelUpEventKey(latestAttemptId, previousProgress, snapshot);
    const shouldAnimateXp =
      latestAttemptId > previousLevelTracker.latestAttemptId &&
      progress.level > previousProgress.level &&
      !hasConsumedLevelUpEvent(levelUpEventKey);
    const nextAnimationState: AchievementAnimationState = {
      changedXp: shouldAnimateXp,
      newBadgeIds: new Set(newBadgeIds),
      newCardIds: new Set(newCardIds),
      previousPercent: snapshot.level > previous.level ? 0 : previous.percent
    };
    processedSnapshotKeyRef.current = snapshotKey;
    setAnimationState(nextAnimationState);
    writeAchievementSnapshot(snapshot);
    writeAchievementLevelTracker({ latestAttemptId, level: progress.level, percent: progress.percent });

    if (nextAnimationState.changedXp) {
      writeConsumedLevelUpEvent(levelUpEventKey);
      setAnimatedProgressLevel(previousProgress.level);
      setAnimatedProgressPercent(previousProgress.percent);
      setProgressAnimationPhase("fill");
      playAchievementXpSound(audioEnabled);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setAnimatedProgressPercent(100));
      });
      const transitionSoundId = window.setTimeout(() => {
        playAchievementLevelTransitionSound(audioEnabled);
        setAnimatedProgressLevel(progress.level);
        setProgressAnimationPhase("reset");
        setAnimatedProgressPercent(0);
        window.setTimeout(() => {
          setProgressAnimationPhase("grow");
          window.requestAnimationFrame(() => {
            window.requestAnimationFrame(() => setAnimatedProgressPercent(progress.percent));
          });
        }, 80);
      }, ACHIEVEMENT_XP_BAR_ANIMATION_MS);
      const resetAnimationId = window.setTimeout(() => {
        setAnimationState((current) => ({ ...current, changedXp: false }));
        setAnimatedProgressLevel(progress.level);
        setAnimatedProgressPercent(progress.percent);
        setProgressAnimationPhase("idle");
      }, ACHIEVEMENT_XP_BAR_ANIMATION_MS * 2 + 240);
      return () => {
        window.clearTimeout(transitionSoundId);
        window.clearTimeout(resetAnimationId);
      };
    }

    setAnimatedProgressLevel(progress.level);
    setAnimatedProgressPercent(progress.percent);
    setProgressAnimationPhase("idle");
  }, [allCardIds, attempts, audioEnabled, badges, hasAnyAchievement, loading, progress]);

  return (
    <section className="rounded-md border border-line bg-white shadow-panel">
      <div className="border-b border-line px-6 py-4">
        <h2 className="text-lg font-semibold">Achievements</h2>
        <p className="mt-1 text-sm text-muted">
          Badges, XP, and score cards from completed local practice results.
        </p>
      </div>

      {loading ? <div className="p-6 text-sm text-muted">Loading achievements...</div> : null}

      {!loading && !hasAnyAchievement ? (
        <div className="p-8 text-center text-sm text-muted">
          Complete a practice session to unlock badges and score cards.
        </div>
      ) : null}

      {!loading && hasAnyAchievement ? (
        <div className="achievement-page-body">
          <AchievementProgressPanel
            animate={animationState.changedXp}
            displayLevel={animatedProgressLevel ?? progress.level}
            displayPercent={animatedProgressPercent ?? progress.percent}
            phase={progressAnimationPhase}
            progress={progress}
          />
          <BadgeStack
            audioEnabled={audioEnabled}
            badges={badges}
            expanded={badgesExpanded}
            newBadgeIds={animationState.newBadgeIds}
            onSelect={setSelectedBadge}
            onToggle={() => setBadgesExpanded((current) => !current)}
          />
          <div className="achievement-card-groups">
            <div className="achievement-section-label">Cards</div>
            {(["Total", "RW", "Math"] as AchievementCategory[]).map((category) => (
              <AchievementStack
                audioEnabled={audioEnabled}
                category={category}
                expanded={expanded[category]}
                items={groups[category]}
                key={category}
                newCardIds={animationState.newCardIds}
                onSelect={setSelectedAchievement}
                scoreCardName={scoreCardName}
                onToggle={() =>
                  setExpanded((current) => ({
                    ...current,
                    [category]: !current[category]
                  }))
                }
              />
            ))}
          </div>
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
            <div className="achievement-card-modal-wrap">
              <AchievementCard enlarged item={selectedAchievement} scoreCardName={scoreCardName} />
            </div>
            <AchievementShareWidget item={selectedAchievement} scoreCardName={scoreCardName} />
          </div>
        </div>
      ) : null}

      {selectedBadge ? (
        <div
          aria-modal="true"
          className="achievement-modal-backdrop"
          onClick={() => setSelectedBadge(null)}
          role="dialog"
        >
          <div className="achievement-modal-content achievement-badge-modal-content" onClick={(event) => event.stopPropagation()}>
            <button
              aria-label="Close achievement badge"
              className="achievement-modal-close"
              onClick={() => setSelectedBadge(null)}
              type="button"
            >
              ×
            </button>
            <BadgeCard badge={selectedBadge} enlarged motionLite={badgeMotionLite} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AchievementProgressPanel({
  animate,
  displayLevel,
  displayPercent,
  phase,
  progress
}: {
  animate: boolean;
  displayLevel: number;
  displayPercent: number;
  phase: "idle" | "fill" | "reset" | "grow";
  progress: AchievementProgress;
}) {
  const tone = getProgressTone(displayLevel);
  return (
    <section
      className={`achievement-progress-panel achievement-progress-tone-${tone} achievement-progress-phase-${phase} ${
        animate ? "is-updated" : ""
      }`}
    >
      <div>
        <div className="achievement-section-label">XP</div>
        <div className="achievement-progress-title">Level {displayLevel}</div>
      </div>
      <div
        className="achievement-progress-container"
        aria-label={`Level ${displayLevel}, ${Math.round(displayPercent)}% to next level`}
      >
        <div className="achievement-progress-bar" style={{ width: `${displayPercent}%` }}>
          <span className="achievement-progress-spark achievement-progress-spark-1" />
          <span className="achievement-progress-spark achievement-progress-spark-2" />
          <span className="achievement-progress-spark achievement-progress-spark-3" />
          <span className="achievement-progress-spark achievement-progress-spark-4" />
          <span className="achievement-progress-spark achievement-progress-spark-5" />
        </div>
        <div className="achievement-progress-text">{Math.round(displayPercent)}%</div>
      </div>
      <div className="achievement-progress-meta">
        {progress.xp} XP · {progress.currentLevelXp}/{progress.nextLevelXp}
      </div>
    </section>
  );
}

function BadgeStack({
  audioEnabled,
  badges,
  expanded,
  newBadgeIds,
  onSelect,
  onToggle
}: {
  audioEnabled: boolean;
  badges: BadgeItem[];
  expanded: boolean;
  newBadgeIds: Set<string>;
  onSelect: (badge: BadgeItem) => void;
  onToggle: () => void;
}) {
  return (
    <section className={`achievement-badge-panel ${expanded ? "is-expanded" : ""}`}>
      <button className="achievement-strip-header" onClick={onToggle} type="button">
        <span>
          <span className="achievement-stack-title">Badges</span>
          <span className="achievement-stack-subtitle">
            {badges.length} unlocked badge{badges.length === 1 ? "" : "s"}
          </span>
        </span>
        <span className="achievement-strip-action">{expanded ? "Revert" : "Expand"}</span>
      </button>
      {expanded ? (
        badges.length === 0 ? (
          <div className="achievement-empty">No badges yet.</div>
        ) : (
          <div className="achievement-badge-grid">
            {badges.map((badge) => (
              <BadgeCard
                audioEnabled={audioEnabled}
                badge={badge}
                isNew={newBadgeIds.has(badge.id)}
                key={badge.id}
                onSelect={onSelect}
              />
            ))}
          </div>
        )
      ) : null}
    </section>
  );
}

function BadgeCard({
  audioEnabled = true,
  badge,
  enlarged = false,
  isNew = false,
  motionLite = false,
  onSelect
}: {
  audioEnabled?: boolean;
  badge: BadgeItem;
  enlarged?: boolean;
  isNew?: boolean;
  motionLite?: boolean;
  onSelect?: (badge: BadgeItem) => void;
}) {
  const valueLengthClass = badge.value.length >= 4 ? "achievement-badge-long-value" : "";
  function selectBadge() {
    if (!onSelect) return;
    playAchievementClickSound(audioEnabled);
    onSelect(badge);
  }

  return (
    <div
      className={`achievement-badge-card achievement-badge-${badge.tier} ${
        enlarged ? "achievement-badge-card-enlarged" : ""
      } ${isNew ? "achievement-badge-card-new" : ""} ${
        motionLite ? "achievement-badge-motion-lite" : ""
      } ${valueLengthClass}`}
      onClick={onSelect ? selectBadge : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectBadge();
              }
            }
          : undefined
      }
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      <div className="achievement-badge-holo" aria-hidden="true">
        <div className="achievement-badge-mid">
          <div className="achievement-badge-face">
            <span className="achievement-badge-value">{badge.value}</span>
          </div>
        </div>
      </div>
      <div className="achievement-badge-title">{badge.title}</div>
    </div>
  );
}

function AchievementStack({
  audioEnabled,
  category,
  expanded,
  items,
  newCardIds,
  onSelect,
  scoreCardName,
  onToggle
}: {
  audioEnabled: boolean;
  category: AchievementCategory;
  expanded: boolean;
  items: AchievementItem[];
  newCardIds: Set<string>;
  onSelect: (item: AchievementItem) => void;
  scoreCardName: string;
  onToggle: () => void;
}) {
  return (
    <section className={`achievement-stack-panel ${expanded ? "is-expanded" : ""}`}>
      <button className="achievement-strip-header" onClick={onToggle} type="button">
        <div>
          <h3 className="achievement-stack-title">{CATEGORY_LABELS[category]} Cards</h3>
          <p className="achievement-stack-subtitle">
            {items.length} saved result{items.length === 1 ? "" : "s"}
          </p>
        </div>
        <span className="achievement-strip-action">
          {expanded ? "Revert" : "Expand"}
        </span>
      </button>

      {expanded ? items.length === 0 ? (
        <div className="achievement-empty">No completed {CATEGORY_LABELS[category]} score yet.</div>
      ) : (
        <div className="achievement-stack-stage">
          <div className="achievement-card-strip is-expanded">
            {items.map((item) => (
              <AchievementCard
                audioEnabled={audioEnabled}
                isNew={newCardIds.has(item.id)}
                item={item}
                key={item.id}
                onSelect={onSelect}
                scoreCardName={scoreCardName}
              />
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function AchievementCard({
  audioEnabled = true,
  enlarged = false,
  isNew = false,
  item,
  onSelect,
  scoreCardName = ""
}: {
  audioEnabled?: boolean;
  enlarged?: boolean;
  isNew?: boolean;
  item: AchievementItem;
  onSelect?: (item: AchievementItem) => void;
  scoreCardName?: string;
}) {
  const completed = formatCompletedAt(item.completedAt);
  const trackerCells = Array.from({ length: 25 }, (_, index) => index + 1);
  const displayName = scoreCardName.trim();
  function selectCard() {
    if (!onSelect) return;
    playAchievementClickSound(audioEnabled);
    onSelect(item);
  }

  return (
    <div
      className={`achievement-card-shell achievement-rank-${item.rank} noselect ${
        enlarged ? "achievement-card-shell-enlarged" : ""
      } ${isNew ? "achievement-card-shell-new" : ""}`}
      onClick={onSelect ? selectCard : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                selectCard();
              }
            }
          : undefined
      }
      role={onSelect ? "button" : undefined}
      tabIndex={onSelect ? 0 : undefined}
    >
      {enlarged ? <div className="achievement-card-background-glow" aria-hidden="true" /> : null}
      <div className="achievement-canvas">
        {trackerCells.map((cell) => (
          <div className={`achievement-tr-${cell}`} key={cell} />
        ))}
      </div>
      <div className="achievement-card">
        <div className="achievement-card-content">
          {displayName ? (
            <div className={`achievement-card-name ${displayName.length > 14 ? "achievement-card-name-long" : ""}`}>
              {displayName}
            </div>
          ) : null}
          <div className="achievement-title">{CATEGORY_LABELS[item.category]}</div>
          <div className="achievement-score">{item.score}</div>
          <div className="achievement-meta">
            <span>{completed.year}</span>
            <span>{completed.date}</span>
            <span>{completed.time}</span>
          </div>
          <div className="achievement-source">{item.questionSetName}</div>
          <div className="achievement-subtitle">
            Tier <span className="achievement-highlight">{item.rank}</span>
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

function AchievementShareWidget({ item, scoreCardName }: { item: AchievementItem; scoreCardName: string }) {
  const [downloadState, setDownloadState] = useState<"idle" | "saving" | "saved">("idle");

  async function handleDownload() {
    setDownloadState("saving");
    try {
      await downloadAchievementImage(item, scoreCardName);
      setDownloadState("saved");
      window.setTimeout(() => setDownloadState("idle"), 1800);
    } catch {
      setDownloadState("idle");
    }
  }

  return (
    <div className={`achievement-share-panel ${downloadState === "saved" ? "is-downloaded" : ""}`}>
      <div className="achievement-share-title">Download achievement</div>
      <ul className="achievement-share-list example-1">
        <ShareButton
          label={downloadState === "saved" ? "Downloaded" : downloadState === "saving" ? "Saving" : "Download"}
          onClick={() => void handleDownload()}
          social="download"
          status={downloadState}
        >
          {downloadState === "saved" ? <CheckIcon /> : <DownloadIcon />}
        </ShareButton>
      </ul>
    </div>
  );
}

function ShareButton({
  children,
  label,
  onClick,
  social,
  status = "idle"
}: {
  children: ReactNode;
  label: string;
  onClick: () => void;
  social: string;
  status?: "idle" | "saving" | "saved";
}) {
  return (
    <li className="icon-content">
      <button
        aria-label={label}
        className={`link ${status === "saved" ? "is-saved" : ""} ${status === "saving" ? "is-saving" : ""}`}
        data-social={social}
        disabled={status === "saving"}
        onClick={onClick}
        type="button"
      >
        <span className="tooltip">{label}</span>
        {children}
      </button>
    </li>
  );
}

function buildAchievementGroups(attempts: AttemptSummary[]): AchievementGroups {
  const completed = attempts
    .filter((attempt) => attempt.status === "completed")
    .filter((attempt) => !isFocusedPracticeAttempt(attempt.mode))
    .sort((a, b) => getAttemptTime(b) - getAttemptTime(a));
  const pairedSections = findSingleSectionPairs(completed);
  const pairedAttemptIds = new Set(pairedSections.flatMap((pair) => [pair.rw.id, pair.math.id]));
  const individualAttempts = completed.filter((attempt) => !pairedAttemptIds.has(attempt.id));

  return {
    Total: [
      ...individualAttempts.flatMap((attempt) => makeAchievementItem(attempt, "Total")),
      ...pairedSections.flatMap(makePairedTotalAchievementItem)
    ],
    RW: [
      ...individualAttempts.flatMap((attempt) => makeAchievementItem(attempt, "RW")),
      ...pairedSections.flatMap((pair) => makeAchievementItem(pair.rw, "RW"))
    ],
    Math: [
      ...individualAttempts.flatMap((attempt) => makeAchievementItem(attempt, "Math")),
      ...pairedSections.flatMap((pair) => makeAchievementItem(pair.math, "Math"))
    ]
  };
}

function findSingleSectionPairs(attempts: AttemptSummary[]): Array<{ rw: AttemptSummary; math: AttemptSummary }> {
  const byQuestionSet = new Map<number, AttemptSummary[]>();
  attempts.forEach((attempt) => {
    byQuestionSet.set(attempt.questionSetId, [...(byQuestionSet.get(attempt.questionSetId) ?? []), attempt]);
  });

  return [...byQuestionSet.values()].flatMap((setAttempts) => {
    const rwAttempts = setAttempts.filter((attempt) => attempt.mode === "full_hard_rw_practice");
    const mathAttempts = setAttempts.filter((attempt) => attempt.mode === "full_hard_math_practice");
    return rwAttempts.length === 1 && mathAttempts.length === 1 ? [{ rw: rwAttempts[0], math: mathAttempts[0] }] : [];
  });
}

function makePairedTotalAchievementItem(pair: { rw: AttemptSummary; math: AttemptSummary }): AchievementItem[] {
  const latestAttempt = getAttemptTime(pair.rw) >= getAttemptTime(pair.math) ? pair.rw : pair.math;
  const score = latestAttempt.practiceScore ?? pair.rw.practiceScore ?? pair.math.practiceScore;
  if (score === null || score === undefined) return [];

  return [
    {
      id: `paired-${pair.rw.id}-${pair.math.id}-Total`,
      category: "Total",
      score,
      rank: getRank(score, "Total"),
      completedAt: latestAttempt.completedAt ?? latestAttempt.startedAt,
      questionSetName: latestAttempt.questionSetName
    }
  ];
}

function isFocusedPracticeAttempt(mode: AttemptSummary["mode"]): boolean {
  return (
    mode === "domain_practice" ||
    mode === "mistake_practice" ||
    mode === "review_list_practice" ||
    mode === "spaced_review"
  );
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

function getAllCardIds(groups: AchievementGroups): string[] {
  return [...groups.Total, ...groups.RW, ...groups.Math].map((item) => item.id);
}

function getLatestCompletedAttemptId(attempts: AttemptSummary[]): number {
  return attempts
    .filter((attempt) => attempt.status === "completed")
    .reduce((latest, attempt) => Math.max(latest, attempt.id), 0);
}

function buildProgressBeforeLatestAttempt(attempts: AttemptSummary[], latestAttemptId: number): AchievementProgress {
  if (latestAttemptId <= 0) return buildProgress([]);
  return buildProgress(attempts.filter((attempt) => attempt.id !== latestAttemptId));
}

function buildAchievementSnapshot(
  progress: AchievementProgress,
  badges: BadgeItem[],
  cardIds: string[]
): AchievementSnapshot {
  return {
    badgeIds: badges.map((badge) => badge.id),
    cardIds,
    xp: progress.xp,
    level: progress.level,
    percent: progress.percent
  };
}

function getAchievementSnapshotKey(snapshot: AchievementSnapshot): string {
  return [
    snapshot.xp,
    snapshot.level,
    snapshot.percent,
    snapshot.badgeIds.join(","),
    snapshot.cardIds.join(",")
  ].join("|");
}

function getLevelUpEventKey(
  latestAttemptId: number,
  previousProgress: AchievementProgress,
  snapshot: AchievementSnapshot
): string {
  return [
    latestAttemptId,
    previousProgress.level,
    snapshot.level,
    snapshot.xp,
    snapshot.cardIds.join(",")
  ].join("|");
}

function hasConsumedLevelUpEvent(eventKey: string): boolean {
  try {
    return window.localStorage.getItem(ACHIEVEMENT_CONSUMED_LEVEL_UP_KEY) === eventKey;
  } catch {
    return false;
  }
}

function writeConsumedLevelUpEvent(eventKey: string) {
  try {
    window.localStorage.setItem(ACHIEVEMENT_CONSUMED_LEVEL_UP_KEY, eventKey);
  } catch {
    // Level-up consumption is decorative; ignore storage failures.
  }
}

function readAchievementLevelTracker(): AchievementLevelTracker | null {
  try {
    const raw = window.localStorage.getItem(ACHIEVEMENT_LEVEL_TRACKER_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AchievementLevelTracker>;
    if (
      typeof parsed.latestAttemptId !== "number" ||
      typeof parsed.level !== "number" ||
      typeof parsed.percent !== "number"
    ) {
      return null;
    }
    return {
      latestAttemptId: parsed.latestAttemptId,
      level: parsed.level,
      percent: parsed.percent
    };
  } catch {
    return null;
  }
}

function writeAchievementLevelTracker(tracker: AchievementLevelTracker) {
  try {
    window.localStorage.setItem(ACHIEVEMENT_LEVEL_TRACKER_KEY, JSON.stringify(tracker));
  } catch {
    // Level tracking is decorative; ignore storage failures.
  }
}

function readAchievementSnapshot(): AchievementSnapshot | null {
  try {
    const raw = window.localStorage.getItem(ACHIEVEMENT_SNAPSHOT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<AchievementSnapshot>;
    if (
      !Array.isArray(parsed.badgeIds) ||
      !Array.isArray(parsed.cardIds) ||
      typeof parsed.xp !== "number" ||
      typeof parsed.level !== "number" ||
      typeof parsed.percent !== "number"
    ) {
      return null;
    }
    return {
      badgeIds: parsed.badgeIds.filter((id): id is string => typeof id === "string"),
      cardIds: parsed.cardIds.filter((id): id is string => typeof id === "string"),
      xp: parsed.xp,
      level: parsed.level,
      percent: parsed.percent
    };
  } catch {
    return null;
  }
}

function writeAchievementSnapshot(snapshot: AchievementSnapshot) {
  try {
    window.localStorage.setItem(ACHIEVEMENT_SNAPSHOT_KEY, JSON.stringify(snapshot));
  } catch {
    // Snapshot animation is decorative; ignore storage failures.
  }
}

function buildProgress(attempts: AttemptSummary[]): AchievementProgress {
  const completed = attempts.filter((attempt) => attempt.status === "completed");
  const scoreXp = completed.reduce((total, attempt) => {
    const score = attempt.practiceScore ?? attempt.rwScore ?? attempt.mathScore ?? 0;
    return total + Math.max(0, Math.round(score / 10));
  }, 0);
  const xp = completed.length * 100 + scoreXp;
  const level = Math.floor(xp / 500) + 1;
  const currentLevelXp = xp % 500;
  const nextLevelXp = 500;
  return {
    xp,
    level,
    currentLevelXp,
    nextLevelXp,
    percent: Math.min(100, Math.round((currentLevelXp / nextLevelXp) * 100))
  };
}

function buildBadges(attempts: AttemptSummary[], scoreResults: ScoreResult[]): BadgeItem[] {
  const completed = attempts.filter((attempt) => attempt.status === "completed");
  const badges: BadgeItem[] = [];
  const streak = calculateLongestStreak(completed);
  const mistakeRecoveries = completed.filter((attempt) => attempt.mode === "mistake_practice").length;
  const progress = buildProgress(attempts);
  const bestScore = getCombinedBestSectionScore(completed);

  if (streak > 0) {
    badges.push({
      id: "streak",
      title: "Streak",
      value: String(streak),
      tier: getTierByValue(streak, [3, 7, 14])
    });
  }

  [1, 5, 10, 25].forEach((target, index) => {
    if (mistakeRecoveries >= target) {
      badges.push({
        id: `mistake-recovery-${target}`,
        title: `Mistake Recovery ${target}`,
        value: String(target),
        tier: (["blue", "yellow", "pink", "purple"] as BadgeTier[])[index]
      });
    }
  });

  getPerfectModules(scoreResults).forEach((module, index) => {
    badges.push({
      id: `perfect-${module}`,
      title: `Perfect ${module}`,
      value: "✓",
      tier: (["yellow", "pink", "purple", "purple"] as BadgeTier[])[Math.min(index, 3)]
    });
  });

  badges.push({
    id: "level",
    title: "Level",
    value: String(progress.level),
    tier: getTierByValue(progress.level, [3, 6, 10])
  });

  if (bestScore > 0) {
    badges.push({
      id: "best-score",
      title: "My Best Score",
      value: String(bestScore),
      tier: getTierByValue(bestScore, [1200, 1400, 1500])
    });
  }

  return badges;
}

function getCombinedBestSectionScore(attempts: AttemptSummary[]): number {
  const bestRwScore = Math.max(
    0,
    ...attempts
      .map((attempt) => attempt.rwScore)
      .filter((score): score is number => score !== null && score !== undefined)
  );
  const bestMathScore = Math.max(
    0,
    ...attempts
      .map((attempt) => attempt.mathScore)
      .filter((score): score is number => score !== null && score !== undefined)
  );
  return bestRwScore + bestMathScore;
}

function calculateLongestStreak(attempts: AttemptSummary[]): number {
  const completedDays = Array.from(
    new Set(
      attempts
        .filter((attempt) => attempt.status === "completed")
        .map((attempt) => toLocalDateKey(attempt.completedAt ?? attempt.startedAt))
    )
  ).sort();
  if (completedDays.length === 0) return 0;

  let longestStreak = 1;
  let currentStreak = 1;
  for (let index = 1; index < completedDays.length; index += 1) {
    if (getCalendarDayNumber(completedDays[index]) === getCalendarDayNumber(completedDays[index - 1]) + 1) {
      currentStreak += 1;
      longestStreak = Math.max(longestStreak, currentStreak);
    } else {
      currentStreak = 1;
    }
  }
  return longestStreak;
}

function getCalendarDayNumber(dateKey: string): number {
  const [year, month, day] = dateKey.split("-").map(Number);
  return Date.UTC(year, month - 1, day) / 86_400_000;
}

function toLocalDateKey(value: string): string {
  const date = new Date(value);
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getPerfectModules(results: ScoreResult[]): string[] {
  const labels = new Set<string>();
  results.forEach((result) => {
    result.moduleBreakdown
      .filter((row) => isPerfectBreakdown(row))
      .forEach((row) => labels.add(row.label));
  });
  return Array.from(labels);
}

function isPerfectBreakdown(row: BreakdownRow): boolean {
  return row.total > 0 && row.correct === row.total;
}

function getTierByValue(value: number, thresholds: [number, number, number]): BadgeTier {
  if (value >= thresholds[2]) return "purple";
  if (value >= thresholds[1]) return "pink";
  if (value >= thresholds[0]) return "yellow";
  return "blue";
}

function getProgressTone(level: number): BadgeTier {
  return getTierByValue(level, [3, 6, 10]);
}

function formatCompletedAt(value: string): { year: string; date: string; time: string } {
  const date = new Date(value);
  return {
    year: new Intl.DateTimeFormat(undefined, { year: "numeric" }).format(date),
    date: new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(date),
    time: new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit" }).format(date)
  };
}

async function downloadAchievementImage(item: AchievementItem, scoreCardName: string): Promise<void> {
  const blob = await createAchievementImageBlob(item, scoreCardName);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = buildDownloadFilename(item);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function createAchievementImageBlob(item: AchievementItem, scoreCardName: string): Promise<Blob> {
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
  const displayName = scoreCardName.trim();
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

  if (displayName) {
    context.fillStyle = colors.text;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.shadowColor = "rgba(0,0,0,0.18)";
    context.shadowBlur = 14;
    context.font = getCanvasNameFont(context, displayName, 600);
    drawWrappedText(context, displayName, width / 2, 206, 620, 46, 2);
  }

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
  context.fillText("Tier", width / 2 - 58, 1060);
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

function getCanvasNameFont(context: CanvasRenderingContext2D, name: string, maxWidth: number): string {
  for (let size = 48; size >= 30; size -= 2) {
    const font = `900 ${size}px Inter, system-ui, sans-serif`;
    context.font = font;
    if (context.measureText(name).width <= maxWidth) {
      return font;
    }
  }
  return "900 30px Inter, system-ui, sans-serif";
}

function DownloadIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M11 3h2v10.2l3.3-3.3 1.4 1.4L12 17 6.3 11.3l1.4-1.4 3.3 3.3V3Zm-6 16h14v2H5v-2Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M9.2 16.6 4.9 12.3l1.4-1.4 2.9 2.9 8.5-8.5 1.4 1.4-9.9 9.9Z" />
    </svg>
  );
}
