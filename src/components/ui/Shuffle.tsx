import { useEffect, useMemo, useRef, useState } from "react";

type ShuffleProps = {
  text: string;
  shuffleDirection?: "left" | "right";
  duration?: number;
  animationMode?: "evenodd" | "random";
  shuffleTimes?: number;
  ease?: string;
  stagger?: number;
  threshold?: number;
  triggerOnce?: boolean;
  respectReducedMotion?: boolean;
  loop?: boolean;
  loopDelay?: number;
  easterEggWords?: string[];
  easterEggEvery?: number;
  className?: string;
};

const SHUFFLE_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function prefersReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

function randomChar(index: number, frame: number, mode: ShuffleProps["animationMode"]) {
  if (mode === "evenodd") {
    return SHUFFLE_CHARS[(index * 7 + frame * 11) % SHUFFLE_CHARS.length] ?? "";
  }
  return SHUFFLE_CHARS[Math.floor(Math.random() * SHUFFLE_CHARS.length)] ?? "";
}

export function Shuffle({
  text,
  shuffleDirection = "right",
  duration = 0.35,
  animationMode = "evenodd",
  shuffleTimes = 1,
  stagger = 0.03,
  triggerOnce = true,
  respectReducedMotion = true,
  loop = false,
  loopDelay = 0,
  easterEggWords = [],
  easterEggEvery = 0,
  className
}: ShuffleProps) {
  const [displayText, setDisplayText] = useState(text);
  const [hasTriggered, setHasTriggered] = useState(false);
  const runningRef = useRef(false);
  const timersRef = useRef<number[]>([]);
  const intervalRef = useRef<number | null>(null);
  const hasTriggeredRef = useRef(false);
  const runCountRef = useRef(0);

  const revealOrder = useMemo(() => {
    const maxLength = Math.max(text.length, ...easterEggWords.map((word) => word.length));
    const indexes = Array.from({ length: maxLength }, (_, index) => index);
    return shuffleDirection === "left" ? indexes.reverse() : indexes;
  }, [easterEggWords, shuffleDirection, text.length]);

  useEffect(() => {
    setDisplayText(text);
  }, [text]);

  useEffect(() => {
    return () => {
      timersRef.current.forEach(window.clearTimeout);
      timersRef.current = [];
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!loop) {
      return undefined;
    }
    intervalRef.current = window.setInterval(runShuffle, loopDelay * 1000);
    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [loop, loopDelay, text]);

  function runShuffle() {
    if (runningRef.current || (!loop && triggerOnce && hasTriggeredRef.current)) {
      return;
    }
    const targetText = nextDisplayText();
    if (respectReducedMotion && prefersReducedMotion()) {
      setDisplayText(targetText);
      hasTriggeredRef.current = true;
      setHasTriggered(true);
      return;
    }

    runningRef.current = true;
    hasTriggeredRef.current = true;
    setHasTriggered(true);
    const frameMs = 32;
    const frames = Math.max(1, Math.round((duration * 1000) / frameMs));
    const staggerFrames = Math.max(0, Math.round((stagger * 1000) / frameMs));
    let frame = 0;

    const tick = () => {
      const nextText = targetText
        .split("")
        .map((char, index) => {
          if (char.trim() === "") {
            return char;
          }
          const orderIndex = revealOrder.indexOf(index);
          const revealFrame = orderIndex * staggerFrames + frames;
          if (frame >= revealFrame) {
            return char;
          }
          return randomChar(index, frame, animationMode);
        })
        .join("");

      setDisplayText(nextText);
      frame += 1;

      const maxFrames = frames + (targetText.length - 1) * staggerFrames + Math.max(0, shuffleTimes - 1) * frames;
      if (frame <= maxFrames) {
        timersRef.current.push(window.setTimeout(tick, frameMs));
        return;
      }

      setDisplayText(targetText);
      runningRef.current = false;
    };

    tick();
  }

  function nextDisplayText() {
    runCountRef.current += 1;
    const shouldShowEasterEgg =
      easterEggEvery > 0 &&
      easterEggWords.length > 0 &&
      runCountRef.current % easterEggEvery === 0;

    if (!shouldShowEasterEgg) {
      return text;
    }

    return easterEggWords[Math.floor(Math.random() * easterEggWords.length)] ?? text;
  }

  return (
    <span className={className}>{displayText}</span>
  );
}
