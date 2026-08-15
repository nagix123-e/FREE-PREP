import { getDatabase } from "../lib/database";
import type { AppSettings } from "../types";

export const DEFAULT_SETTINGS: AppSettings = {
  language: "en",
  theme: "system",
  timerDefaultVisible: true,
  defaultPracticeLength: 20,
  fullscreenTestMode: false,
  audioEnabled: true,
  practiceMode: "regular",
  scoreCardName: ""
};

const SETTINGS_KEY = "app_settings";

export async function loadSettings(): Promise<AppSettings> {
  const db = await getDatabase();
  const rows = await db.select<Array<{ value: string }>>(
    "SELECT value FROM app_settings WHERE key = $1",
    [SETTINGS_KEY]
  );
  if (!rows[0]) {
    return DEFAULT_SETTINGS;
  }
  try {
    return { ...DEFAULT_SETTINGS, ...(JSON.parse(rows[0].value) as Partial<AppSettings>) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveSettings(settings: AppSettings): Promise<void> {
  const db = await getDatabase();
  await db.execute(
    `INSERT INTO app_settings (key, value)
     VALUES ($1, $2)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
    [SETTINGS_KEY, JSON.stringify(settings)]
  );
}
