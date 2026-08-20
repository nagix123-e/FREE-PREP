import { useEffect, useState } from "react";
import { SAT_TIPS } from "../content/satTips";
import { useSystemLanguage } from "../i18n";

const ROTATION_INTERVAL_MS = 20_000;
const FLIP_DURATION_MS = 360;

export function HomeTipCarousel() {
  const { t } = useSystemLanguage();
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * SAT_TIPS.length));
  const [isFlipping, setIsFlipping] = useState(false);

  useEffect(() => {
    let flipTimer: number | undefined;
    const interval = window.setInterval(() => {
      setIsFlipping(true);
      flipTimer = window.setTimeout(() => {
        setTipIndex((current) => (current + 1) % SAT_TIPS.length);
        setIsFlipping(false);
      }, FLIP_DURATION_MS);
    }, ROTATION_INTERVAL_MS);

    return () => {
      window.clearInterval(interval);
      if (flipTimer !== undefined) {
        window.clearTimeout(flipTimer);
      }
    };
  }, []);

  return (
    <aside aria-live="polite" className="home-tip-carousel" aria-label={t("satStudyTip")}>
      <div
        key={SAT_TIPS[tipIndex].id}
        className={`home-tip-carousel__surface${isFlipping ? " is-flipping" : ""}`}
      >
        <span className="home-tip-carousel__eyebrow">{t("satStudyTip")}</span>
        <p className="home-tip-carousel__text">{SAT_TIPS[tipIndex].text}</p>
      </div>
    </aside>
  );
}
