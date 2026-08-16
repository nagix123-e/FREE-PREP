import type { HighlightRecord } from "../../types";

export function findSelectedHighlightMarker(range: Range): HTMLElement | null {
  const elementFor = (node: Node): Element | null =>
    node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  const start = elementFor(range.startContainer);
  const end = elementFor(range.endContainer);
  const candidates = [
    start?.closest("mark.practice-highlight"),
    end?.closest("mark.practice-highlight"),
    elementFor(range.commonAncestorContainer)?.closest("mark.practice-highlight")
  ];

  for (const candidate of candidates) {
    if (
      candidate instanceof HTMLElement &&
      candidate.contains(range.startContainer) &&
      candidate.contains(range.endContainer)
    ) {
      return candidate;
    }
  }

  // A browser can represent a re-selection as boundaries around the <mark>
  // element itself rather than inside its text node. Match that exact marker
  // too, so applying its current color consistently removes it.
  const selectedText = range.toString().trim();
  if (!selectedText) return null;
  for (const marker of document.querySelectorAll<HTMLElement>("mark.practice-highlight")) {
    if (marker.textContent?.trim() === selectedText && range.intersectsNode(marker)) {
      return marker;
    }
  }
  return null;
}

export function createHighlightMarker(
  range: Range,
  color: HighlightRecord["color"],
  startOffset: number,
  endOffset: number
): HTMLElement {
  const marker = document.createElement("mark");
  marker.className = `practice-highlight practice-highlight-${color}`;
  marker.dataset.highlightStart = String(startOffset);
  marker.dataset.highlightEnd = String(endOffset);
  range.surroundContents(marker);
  return marker;
}

export function getHighlightMarkerOffsets(
  marker: HTMLElement,
  fallbackStart: number,
  fallbackLength: number
): { startOffset: number; endOffset: number } {
  const startOffset = Number(marker.dataset.highlightStart);
  const endOffset = Number(marker.dataset.highlightEnd);
  if (Number.isInteger(startOffset) && Number.isInteger(endOffset) && startOffset >= 0 && endOffset >= startOffset) {
    return { startOffset, endOffset };
  }
  return { startOffset: fallbackStart, endOffset: fallbackStart + fallbackLength };
}

export function setHighlightMarkerColor(marker: HTMLElement, color: HighlightRecord["color"]): void {
  marker.classList.remove("practice-highlight-yellow", "practice-highlight-blue", "practice-highlight-pink");
  marker.classList.add(`practice-highlight-${color}`);
}

export function getHighlightMarkerColor(marker: HTMLElement): HighlightRecord["color"] | null {
  if (marker.classList.contains("practice-highlight-blue")) return "blue";
  if (marker.classList.contains("practice-highlight-pink")) return "pink";
  if (marker.classList.contains("practice-highlight-yellow")) return "yellow";
  return null;
}

export function unwrapHighlightMarker(marker: HTMLElement): void {
  const parent = marker.parentNode;
  if (!parent) return;
  while (marker.firstChild) {
    parent.insertBefore(marker.firstChild, marker);
  }
  parent.removeChild(marker);
  parent.normalize();
}
