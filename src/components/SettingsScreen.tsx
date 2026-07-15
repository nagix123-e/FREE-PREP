import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, loadSettings, saveSettings } from "../services/settingsService";
import type { AppSettings } from "../types";
import { DropdownSelect, type DropdownOption } from "./ui/DropdownSelect";

export function SettingsScreen() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

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

  async function handleSave() {
    setError("");
    setSaved(false);
    try {
      await saveSettings(settings);
      setSaved(true);
    } catch (saveError: unknown) {
      setError(formatError(saveError, "Could not save settings."));
    }
  }

  function handleScoreCardNameChange(value: string) {
    setSettings({ ...settings, scoreCardName: value.slice(0, 20) });
  }

  return (
    <section className="max-w-3xl rounded-md border border-line bg-white p-6 shadow-panel">
      <h2 className="text-lg font-semibold">Settings</h2>
      <div className="mt-6 grid grid-cols-2 gap-4">
        <DropdownSelect label="Timer" value={settings.timerDefaultVisible ? "show" : "hide"} onChange={(value) => setSettings({ ...settings, timerDefaultVisible: value === "show" })} options={SHOW_HIDE_OPTIONS} />
        <DropdownSelect label="Default Practice Length" value={settings.defaultPracticeLength.toString()} onChange={(value) => setSettings({ ...settings, defaultPracticeLength: Number(value) })} options={PRACTICE_LENGTH_OPTIONS} />
        <DropdownSelect label="Audio" value={settings.audioEnabled ? "on" : "off"} onChange={(value) => setSettings({ ...settings, audioEnabled: value === "on" })} options={AUDIO_OPTIONS} />
        <label className="settings-name-field">
          <span className="settings-name-field__label">Name That Appears On Score Cards</span>
          <input
            className="settings-name-field__input"
            maxLength={20}
            onChange={(event) => handleScoreCardNameChange(event.target.value)}
            placeholder="Name here"
            type="text"
            value={settings.scoreCardName}
          />
        </label>
      </div>
      <button className="mt-6 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => void handleSave()} type="button">
        Save Settings
      </button>
      {saved ? <div className="mt-4 text-sm text-teal-700">Settings saved locally.</div> : null}
      {error ? <div className="mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}
      <section className="mt-8 rounded-md border border-line bg-slate-50 p-4">
        <h3 className="font-semibold">Keyboard Shortcuts</h3>
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          {["Next: Right Arrow", "Back: Left Arrow", "Mark: M", "Question Menu: Q", "Pause: P", "Submit Module: Ctrl + Enter", "Toggle Timer: T"].map((item) => (
            <div className="rounded-md border border-line bg-white p-2" key={item}>{item}</div>
          ))}
        </div>
      </section>
    </section>
  );
}

function formatError(error: unknown, fallback: string): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

const SHOW_HIDE_OPTIONS: DropdownOption[] = [
  { value: "show", label: "Show" },
  { value: "hide", label: "Hide" }
];

const AUDIO_OPTIONS: DropdownOption[] = [
  { value: "on", label: "On" },
  { value: "off", label: "Off" }
];

const PRACTICE_LENGTH_OPTIONS: DropdownOption[] = [10, 20, 30, 50, 100].map((value) => ({
  value: value.toString(),
  label: value.toString()
}));
