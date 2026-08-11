import { useEffect, useMemo, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { canSaveValidationSummary, parseCsvText } from "../lib/csvValidation";
import { listQuestionSets, saveQuestionSet } from "../lib/database";
import { useAppStore } from "../store/appStore";
import { useSystemLanguage } from "../i18n";

type MarketplaceItem = {
  id: string;
  collection: string;
  description: string;
  filename: string;
  path: string;
  price: "$0";
  source: string;
  title: string;
};

type MarketplaceManifest = {
  items: MarketplaceItem[];
  updatedAt: string;
  version: number;
};

type ImportState = {
  id: string;
  message: string;
  status: "idle" | "loading" | "done" | "error";
};

const MARKETPLACE_REMOTE_ROOT = "https://raw.githubusercontent.com/nagix123-e/SAT-PREP/main";
const MARKETPLACE_REMOTE_MANIFEST_URL = `${MARKETPLACE_REMOTE_ROOT}/public/marketplace/manifest.json`;
const MARKETPLACE_LOCAL_MANIFEST_URL = "/marketplace/manifest.json";

export function MarketplacePage() {
  const { t } = useSystemLanguage();
  const { navigate, setDbError, setQuestionSets, tutorial, recordTutorialImport } = useAppStore();
  const [manifest, setManifest] = useState<MarketplaceManifest | null>(null);
  const [manifestSource, setManifestSource] = useState<"local" | "remote">("local");
  const [selectedId, setSelectedId] = useState("");
  const [selectedBundleIds, setSelectedBundleIds] = useState<Set<string>>(new Set());
  const [loadError, setLoadError] = useState("");
  const [importState, setImportState] = useState<ImportState>({ id: "", message: "", status: "idle" });

  useEffect(() => {
    loadMarketplaceManifest()
      .then(({ manifest: nextManifest, source }) => {
        setManifest(nextManifest);
        setManifestSource(source);
        setSelectedId(nextManifest.items[0]?.id ?? "");
        setSelectedBundleIds(new Set(nextManifest.items[0]?.id ? [nextManifest.items[0].id] : []));
        setLoadError("");
      })
      .catch((error: unknown) => {
        setManifest(null);
        setSelectedId("");
        setLoadError(error instanceof Error ? error.message : "Could not load marketplace.");
      });
  }, []);

  const items = manifest?.items ?? [];
  const selectedItem = items.find((item) => item.id === selectedId) ?? items[0] ?? null;
  const selectedBundles = items.filter((item) => selectedBundleIds.has(item.id));
  const groupedItems = useMemo(() => groupMarketplaceItems(items), [items]);

  async function saveMarketplaceItem(item: MarketplaceItem) {
    const csvText = await loadMarketplaceCsv(item.path, manifestSource);
    const summary = parseCsvText(csvText);
    if (!canSaveValidationSummary(summary)) {
      const firstError = summary.issues.find((issue) => issue.level === "error");
      throw new Error(firstError?.message ?? "This bundle is not valid and cannot be imported.");
    }
    return saveQuestionSet({
      name: item.title,
      description: `${item.collection}. ${item.description}`,
      questions: summary.questions,
      status: summary.issues.length > 0 ? "warning" : "valid",
      packageType: summary.packageType ?? undefined,
      sourceFilename: item.filename,
      rowCount: summary.rowCount,
      sectionCounts: summary.sectionCounts,
      previewPassword: summary.previewPassword
    });
  }

  async function importMarketplaceItem(item: MarketplaceItem) {
    setImportState({ id: item.id, message: "Importing...", status: "loading" });
    try {
      const saved = await saveMarketplaceItem(item);
      const sets = await listQuestionSets();
      setQuestionSets(sets);
      setDbError(null);
      setImportState({ id: item.id, message: `Imported ${saved.name}`, status: "done" });
      if (tutorial.active && tutorial.step === "marketplace_add" && item.id === items[0]?.id) {
        recordTutorialImport(saved.id, saved.name);
        navigate("sets");
        return;
      }
      navigate("preview", saved.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not import marketplace bundle.";
      setImportState({ id: item.id, message, status: "error" });
      setDbError(message);
    }
  }

  async function importSelectedMarketplaceItems() {
    if (selectedBundles.length === 0) return;

    setImportState({
      id: "batch",
      message: `Importing 0/${selectedBundles.length} bundles...`,
      status: "loading"
    });
    try {
      let lastSavedId: number | undefined;
      for (let index = 0; index < selectedBundles.length; index += 1) {
        const item = selectedBundles[index];
        setImportState({
          id: "batch",
          message: `Importing ${index + 1}/${selectedBundles.length}: ${item.title}`,
          status: "loading"
        });
        const saved = await saveMarketplaceItem(item);
        lastSavedId = saved.id;
      }
      const sets = await listQuestionSets();
      setQuestionSets(sets);
      setDbError(null);
      setImportState({
        id: "batch",
        message: `Imported ${selectedBundles.length} bundles`,
        status: "done"
      });
      if (lastSavedId) {
        navigate("preview", lastSavedId);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not import selected marketplace bundles.";
      setImportState({ id: "batch", message, status: "error" });
      setDbError(message);
    }
  }

  function toggleBundleSelection(item: MarketplaceItem) {
    setSelectedId(item.id);
    setSelectedBundleIds((current) => {
      const next = new Set(current);
      if (next.has(item.id)) {
        next.delete(item.id);
      } else {
        next.add(item.id);
      }
      return next;
    });
  }

  function selectBundleGroup(groupItems: MarketplaceItem[]) {
    setSelectedBundleIds((current) => {
      const next = new Set(current);
      groupItems.forEach((item) => next.add(item.id));
      return next;
    });
    if (groupItems[0]) {
      setSelectedId(groupItems[0].id);
    }
  }

  function clearBundleGroup(groupItems: MarketplaceItem[]) {
    setSelectedBundleIds((current) => {
      const next = new Set(current);
      groupItems.forEach((item) => next.delete(item.id));
      return next;
    });
  }

  return (
    <div className="marketplace-layout grid gap-6">
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <div className="flex flex-wrap items-start gap-4 border-b border-line pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-teal-50 text-2xl font-black text-teal-700">
            ⬇
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-teal-700">{t("marketDownloadGithub")}</div>
            <h2 className="mt-2 text-2xl font-semibold">{t("marketTitle")}</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {t("marketDescription")}
            </p>
          </div>
        </div>

        {loadError ? (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}</div>
        ) : null}

        {!loadError && items.length === 0 ? (
          <div className="mt-6 text-sm text-muted">{t("loadingMarketplace")}</div>
        ) : null}

        <div className="mt-6 space-y-6">
          {groupedItems.map((group) => (
            <div key={group.collection}>
              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold">{group.collection}</h3>
                  <p className="mt-1 text-xs text-muted">{group.items.length} free bundles</p>
                </div>
                <div className="flex flex-wrap items-center justify-end gap-2">
                  <button
                    className="rounded-md border border-line bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    onClick={() => selectBundleGroup(group.items)}
                    type="button"
                  >
                    Select all
                  </button>
                  <button
                    className="rounded-md border border-line bg-white px-3 py-1 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    onClick={() => clearBundleGroup(group.items)}
                    type="button"
                  >
                    Clear
                  </button>
                  <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">$0</span>
                </div>
              </div>
              <div className="marketplace-card-grid grid gap-4">
                {group.items.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  const isChecked = selectedBundleIds.has(item.id);
                  const isImporting = importState.status === "loading" && importState.id === item.id;
                  const isTutorialFirstItem = tutorial.active && tutorial.step === "marketplace_add" && item.id === items[0]?.id;
                  return (
                    <article
                      className={`rounded-md border bg-white p-4 transition ${
                        isChecked ? "border-teal-300 ring-2 ring-teal-100" : isSelected ? "border-sky-200 ring-2 ring-sky-100" : "border-line hover:border-teal-200"
                      }`}
                      key={item.id}
                    >
                      <button className="block w-full text-left" onClick={() => toggleBundleSelection(item)} type="button">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="inline-flex rounded-md bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
                                {item.source === "generated-and-audited" ? "AUDITED" : "PDF"}
                              </span>
                              <span className={`inline-flex rounded-md px-3 py-1 text-xs font-bold ${isChecked ? "bg-teal-700 text-white" : "bg-slate-100 text-slate-600"}`}>
                                {isChecked ? "SELECTED" : "SELECT"}
                              </span>
                            </div>
                            <h4 className="csv-name-wrap mt-3 text-base font-semibold">{item.title}</h4>
                            <p className="csv-name-wrap mt-1 text-xs text-muted">{item.filename}</p>
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-slate-600">{item.description}</p>
                      </button>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                        <button
                          className={`rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-300 ${
                            isTutorialFirstItem ? "tutorial-active-target tutorial-target-ring" : ""
                          }`}
                          disabled={isImporting}
                          onClick={() => void importMarketplaceItem(item)}
                          type="button"
                        >
                          {isImporting ? "Importing..." : "Get for $0"}
                        </button>
                        {importState.id === item.id && importState.message ? (
                          <span
                            className={`text-xs font-semibold ${
                              importState.status === "error" ? "text-red-700" : "text-teal-700"
                            }`}
                          >
                            {importState.message}
                          </span>
                        ) : null}
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <aside className="rounded-md border border-line bg-white p-6 shadow-panel">
        <h3 className="text-base font-semibold">{t("previewCheckout")}</h3>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          No account, card, or payment provider is used. The selected CSV is fetched and inserted into local SQLite.
        </p>
        <div className="mt-6 rounded-md bg-slate-50 p-4 text-sm">
          <div className="text-xs font-bold uppercase text-slate-500">{t("selectedBundles")}</div>
          <div className="mt-2 text-2xl font-black">{selectedBundles.length}</div>
          {selectedBundles.length > 0 ? (
            <div className="mt-3 max-h-48 space-y-2 overflow-auto pr-1">
              {selectedBundles.map((item) => (
                <div className="rounded-md border border-line bg-white px-3 py-2" key={item.id}>
                  <div className="csv-name-wrap text-xs font-semibold">{item.title}</div>
                  <div className="csv-name-wrap mt-1 text-[11px] text-muted">{item.filename}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-2 text-xs text-muted">{t("selectBundles")}</div>
          )}
        </div>
        <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm">
          <div className="text-xs font-bold uppercase text-slate-500">{t("previewPrice")}</div>
          <div className="mt-2 text-3xl font-black">$0</div>
        </div>
        {selectedItem ? (
          <button
            className="mt-6 w-full rounded-md bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={selectedBundles.length === 0 || importState.status === "loading"}
            onClick={() => void importSelectedMarketplaceItems()}
            type="button"
          >
            Get {selectedBundles.length || ""} selected for $0
          </button>
        ) : null}
        {importState.id === "batch" && importState.message ? (
          <div
            className={`mt-3 text-xs font-semibold ${
              importState.status === "error" ? "text-red-700" : "text-teal-700"
            }`}
          >
            {importState.message}
          </div>
        ) : null}
      </aside>
    </div>
  );
}

async function loadMarketplaceManifest(): Promise<{ manifest: MarketplaceManifest; source: "local" | "remote" }> {
  try {
    return {
      manifest: await fetchMarketplaceManifest(MARKETPLACE_REMOTE_MANIFEST_URL),
      source: "remote"
    };
  } catch {
    if (isTauriRuntime()) {
      return {
        manifest: JSON.parse(await loadBundledMarketplaceAsset("manifest.json")) as MarketplaceManifest,
        source: "local"
      };
    }
    return { manifest: await fetchMarketplaceManifest(MARKETPLACE_LOCAL_MANIFEST_URL), source: "local" };
  }
}

async function fetchMarketplaceManifest(url: string): Promise<MarketplaceManifest> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Could not load marketplace manifest (${response.status}).`);
  return response.json() as Promise<MarketplaceManifest>;
}

function resolveMarketplaceAssetPath(path: string, source: "local" | "remote"): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (source === "remote") return `${MARKETPLACE_REMOTE_ROOT}/public${path}`;
  return path;
}

async function loadMarketplaceCsv(path: string, source: "local" | "remote"): Promise<string> {
  if (source === "local" && isTauriRuntime()) {
    return loadBundledMarketplaceAsset(toMarketplaceResourcePath(path));
  }

  const response = await fetch(resolveMarketplaceAssetPath(path, source));
  if (!response.ok) throw new Error(`Could not download marketplace CSV (${response.status}).`);
  return response.text();
}

function isTauriRuntime(): boolean {
  return "__TAURI_INTERNALS__" in window;
}

function loadBundledMarketplaceAsset(relativePath: string): Promise<string> {
  return invoke<string>("load_marketplace_asset", { relativePath });
}

function toMarketplaceResourcePath(path: string): string {
  const normalized = path.replace(/^\/+/, "");
  if (!normalized.startsWith("marketplace/")) {
    throw new Error("Invalid marketplace asset path.");
  }
  return normalized.slice("marketplace/".length);
}

function groupMarketplaceItems(items: MarketplaceItem[]): Array<{ collection: string; items: MarketplaceItem[] }> {
  const groups = new Map<string, MarketplaceItem[]>();
  items.forEach((item) => {
    groups.set(item.collection, [...(groups.get(item.collection) ?? []), item]);
  });
  return Array.from(groups.entries()).map(([collection, groupItems]) => ({ collection, items: groupItems }));
}
