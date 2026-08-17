import { invoke } from "@tauri-apps/api/core";

export const KIOSK_MODE_CHANGE_EVENT = "free-prep:kiosk-mode-change";

function notifyKioskModeChange(active: boolean): void {
  window.dispatchEvent(new CustomEvent<boolean>(KIOSK_MODE_CHANGE_EVENT, { detail: active }));
}

function requireTauri(): void {
  if (typeof window === "undefined" || !("__TAURI_INTERNALS__" in window)) {
    throw new Error("Kiosk mode is available only in the FREE PREP desktop app.");
  }
}

export async function getKioskModeStatus(): Promise<boolean> {
  requireTauri();
  return invoke<boolean>("kiosk_mode_status");
}

export async function startKioskMode(password: string): Promise<void> {
  requireTauri();
  await invoke("start_kiosk_mode", { password });
  notifyKioskModeChange(true);
}

export async function endKioskMode(password: string): Promise<void> {
  requireTauri();
  await invoke("end_kiosk_mode", { password });
  notifyKioskModeChange(false);
}
