export async function enterFullscreen(): Promise<void> {
  if (!document.fullscreenElement) {
    await document.documentElement.requestFullscreen();
  }
}

export async function exitFullscreen(): Promise<void> {
  if (document.fullscreenElement) {
    await document.exitFullscreen();
  }
}

export function isFullscreen(): boolean {
  return Boolean(document.fullscreenElement);
}
