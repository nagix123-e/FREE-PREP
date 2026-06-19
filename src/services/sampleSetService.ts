import type { QuestionSet } from "../types";

export interface SampleSetManifestItem {
  id: string;
  name: string;
  description: string;
  filename: string;
}

export interface SampleSetOption extends SampleSetManifestItem {
  sourceFilename: string;
  saved: boolean;
}

const SAMPLE_MANIFEST_URL = "/samples/manifest.json";

export async function listSampleSetOptions(questionSets: QuestionSet[]): Promise<SampleSetOption[]> {
  const samples = await loadSampleManifest();
  return samples.map((sample) => {
    const sourceFilename = buildSampleSourceFilename(sample);
    return {
      ...sample,
      sourceFilename,
      saved: questionSets.some((set) => set.sourceFilename === sourceFilename)
    };
  });
}

export async function loadSampleCsv(sample: SampleSetOption): Promise<string> {
  const response = await fetch(`/samples/${encodeURIComponent(sample.filename)}`);
  if (!response.ok) {
    throw new Error(`Could not load sample CSV: ${sample.filename}`);
  }
  return response.text();
}

export function getUnsavedSampleOptions(samples: SampleSetOption[]): SampleSetOption[] {
  return samples.filter((sample) => !sample.saved);
}

function buildSampleSourceFilename(sample: SampleSetManifestItem): string {
  return `sample:${sample.id}:${sample.filename}`;
}

async function loadSampleManifest(): Promise<SampleSetManifestItem[]> {
  try {
    const response = await fetch(SAMPLE_MANIFEST_URL);
    if (!response.ok) {
      return [];
    }
    const data = (await response.json()) as unknown;
    if (!Array.isArray(data)) {
      return [];
    }
    return data.filter(isSampleSetManifestItem);
  } catch {
    return [];
  }
}

function isSampleSetManifestItem(value: unknown): value is SampleSetManifestItem {
  if (!value || typeof value !== "object") {
    return false;
  }
  const item = value as Record<string, unknown>;
  return (
    typeof item.id === "string" &&
    typeof item.name === "string" &&
    typeof item.description === "string" &&
    typeof item.filename === "string" &&
    item.id.trim().length > 0 &&
    item.filename.trim().length > 0
  );
}
