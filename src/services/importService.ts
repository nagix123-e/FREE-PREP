import { getDatabase } from "../lib/database";
import type { ExportBundle } from "./exportService";

export async function importJsonBundle(rawJson: string, overwrite: boolean): Promise<void> {
  const parsed = JSON.parse(rawJson) as Partial<ExportBundle>;
  const db = await getDatabase();

  await db.execute("BEGIN TRANSACTION");
  try {
    if (overwrite) {
      await db.execute("DELETE FROM responses");
      await db.execute("DELETE FROM attempts");
      await db.execute("DELETE FROM review_list");
      await db.execute("DELETE FROM app_settings");
    }

    for (const setting of parsed.settings ?? []) {
      const row = setting as { key?: string; value?: string };
      if (row.key && row.value !== undefined) {
        await db.execute(
          `INSERT INTO app_settings (key, value)
           VALUES ($1, $2)
           ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
          [row.key, row.value]
        );
      }
    }
    await db.execute("COMMIT");
  } catch (error) {
    await db.execute("ROLLBACK");
    throw error;
  }
}
