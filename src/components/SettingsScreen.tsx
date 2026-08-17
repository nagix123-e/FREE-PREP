import { useEffect, useState, type FormEvent } from "react";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "../services/settingsService";
import { endKioskMode, getKioskModeStatus, startKioskMode } from "../services/kioskModeService";
import type { AppSettings } from "../types";
import { DropdownSelect, type DropdownOption } from "./ui/DropdownSelect";
import { SYSTEM_LANGUAGE_OPTIONS, useSystemLanguage } from "../i18n";

export function SettingsScreen() {
  const { setLanguage, t } = useSystemLanguage();
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [kioskActive, setKioskActive] = useState(false);
  const [kioskDialog, setKioskDialog] = useState<"start" | "end" | null>(null);
  const [kioskMessage, setKioskMessage] = useState("");

  useEffect(() => {
    loadSettings()
      .then((loaded) => {
        setSettings(loaded);
        setError("");
      })
      .catch((loadError: unknown) => {
        setSettings(DEFAULT_SETTINGS);
        setError(formatError(loadError, "Could not load settings. Defaults are shown."));
      });
  }, []);

  useEffect(() => {
    getKioskModeStatus().then(setKioskActive).catch(() => setKioskActive(false));
  }, []);

  async function handleSave() {
    setError("");
    setSaved(false);
    try {
      await saveSettings(settings);
      setLanguage(settings.language);
      setSaved(true);
    } catch (saveError: unknown) {
      setError(formatError(saveError, "Could not save settings."));
    }
  }

  function handleScoreCardNameChange(value: string) {
    setSettings({ ...settings, scoreCardName: value.slice(0, 20) });
  }

  async function handleKioskPassword(password: string) {
    if (kioskDialog === "start") {
      await startKioskMode(password);
      setKioskActive(true);
      setKioskMessage(t("kioskModeStarted"));
    } else {
      await endKioskMode(password);
      setKioskActive(false);
      setKioskMessage(t("kioskModeEnded"));
    }
    setKioskDialog(null);
  }

  return (
    <section className="max-w-3xl rounded-md border border-line bg-white p-6 shadow-panel">
      <h2 className="text-lg font-semibold">{t("settings")}</h2>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <DropdownSelect label={t("systemLanguage")} value={settings.language} onChange={(value) => setSettings({ ...settings, language: value as AppSettings["language"] })} options={SYSTEM_LANGUAGE_OPTIONS} />
        <DropdownSelect label={t("timer")} value={settings.timerDefaultVisible ? "show" : "hide"} onChange={(value) => setSettings({ ...settings, timerDefaultVisible: value === "show" })} options={showHideOptions(t)} />
        <DropdownSelect label={t("defaultPracticeLength")} value={settings.defaultPracticeLength.toString()} onChange={(value) => setSettings({ ...settings, defaultPracticeLength: Number(value) })} options={PRACTICE_LENGTH_OPTIONS} />
        <DropdownSelect label={t("audio")} value={settings.audioEnabled ? "on" : "off"} onChange={(value) => setSettings({ ...settings, audioEnabled: value === "on" })} options={audioOptions(t)} />
        <DropdownSelect label={t("practiceMode")} value={settings.practiceMode} onChange={(value) => setSettings({ ...settings, practiceMode: value as AppSettings["practiceMode"] })} options={PRACTICE_MODE_OPTIONS} />
        <label className="settings-name-field">
          <span className="settings-name-field__label">{t("nameOnScoreCards")}</span>
          <input
            className="settings-name-field__input"
            maxLength={20}
            onChange={(event) => handleScoreCardNameChange(event.target.value)}
            placeholder={t("nameHere")}
            type="text"
            value={settings.scoreCardName}
          />
        </label>
      </div>
      <button className="mt-6 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => void handleSave()} type="button">
        {t("saveSettings")}
      </button>
      {saved ? <div className="mt-4 text-sm text-teal-700">{t("settingsSaved")}</div> : null}
      {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}
      <section className="mt-8 border-t border-line pt-6">
        <h3 className="font-semibold">{t("kioskMode")}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{t("kioskModeDescription")}</p>
        <div className="mt-4 flex items-center gap-3">
          <button
            className={kioskActive
              ? "rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              : "rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"}
            onClick={() => { setKioskMessage(""); setKioskDialog(kioskActive ? "end" : "start"); }}
            type="button"
          >
            {kioskActive ? t("endKioskMode") : t("startKioskMode")}
          </button>
          {kioskActive ? <span className="text-sm font-medium text-teal-700">{t("kioskModeActive")}</span> : null}
        </div>
        {kioskMessage ? <div className="mt-3 text-sm text-teal-700">{kioskMessage}</div> : null}
      </section>
      <section className="mt-8 rounded-md border border-line bg-slate-50 p-4">
        <h3 className="font-semibold">{t("keyboardShortcuts")}</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {[t("nextShortcut"), t("backShortcut"), t("markShortcut"), t("questionMenuShortcut"), t("pauseShortcut"), t("submitShortcut"), t("toggleTimerShortcut")].map((item) => (
            <div className="rounded-md border border-line bg-white p-2" key={item}>{item}</div>
          ))}
        </div>
      </section>
      {kioskDialog ? <KioskPasswordDialog mode={kioskDialog} onClose={() => setKioskDialog(null)} onSubmit={handleKioskPassword} t={t} /> : null}
    </section>
  );
}

function KioskPasswordDialog({
  mode,
  onClose,
  onSubmit,
  t
}: {
  mode: "start" | "end";
  onClose: () => void;
  onSubmit: (password: string) => Promise<void>;
  t: ReturnType<typeof useSystemLanguage>["t"];
}) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const isStarting = mode === "start";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isStarting && password !== confirmation) {
      setError(t("kioskPasswordMismatch"));
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onSubmit(password);
    } catch (submitError: unknown) {
      setError(formatError(submitError, t("kioskPasswordError")));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/40 p-4" role="presentation">
      <section aria-modal="true" className="w-full max-w-md rounded-md border border-line bg-white p-6 shadow-xl" role="dialog">
        <h3 className="text-lg font-semibold">{isStarting ? t("setKioskPassword") : t("enterKioskPassword")}</h3>
        <p className="mt-2 text-sm leading-6 text-slate-600">{isStarting ? t("kioskPasswordHint") : t("endKioskModePrompt")}</p>
        <form className="mt-5" onSubmit={(event) => void handleSubmit(event)}>
          <label className="block text-sm font-semibold text-slate-700">
            {t("kioskPassword")}
            <input autoFocus className="mt-2 w-full rounded-md border border-line px-3 py-2 text-base" minLength={6} onChange={(event) => setPassword(event.target.value)} required type="password" value={password} />
          </label>
          {isStarting ? (
            <label className="mt-4 block text-sm font-semibold text-slate-700">
              {t("confirmKioskPassword")}
              <input className="mt-2 w-full rounded-md border border-line px-3 py-2 text-base" minLength={6} onChange={(event) => setConfirmation(event.target.value)} required type="password" value={confirmation} />
            </label>
          ) : null}
          {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
          <div className="mt-6 flex justify-end gap-3">
            <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" disabled={submitting} onClick={onClose} type="button">{t("cancel")}</button>
            <button className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:opacity-50" disabled={submitting} type="submit">{isStarting ? t("startKioskMode") : t("endKioskMode")}</button>
          </div>
        </form>
      </section>
    </div>
  );
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

function showHideOptions(t: ReturnType<typeof useSystemLanguage>["t"]): DropdownOption[] {
  return [{ value: "show", label: t("show") }, { value: "hide", label: t("hide") }];
}

function audioOptions(t: ReturnType<typeof useSystemLanguage>["t"]): DropdownOption[] {
  return [{ value: "on", label: t("on") }, { value: "off", label: t("off") }];
}

const PRACTICE_LENGTH_OPTIONS: DropdownOption[] = [10, 20, 30, 50, 100].map((value) => ({
  value: value.toString(),
  label: value.toString()
}));

const PRACTICE_MODE_OPTIONS: DropdownOption[] = [
  { value: "regular", label: "Same as regular test" },
  { value: "focused", label: "Practice focused" }
];
