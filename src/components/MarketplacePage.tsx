import { useEffect, useMemo, useState } from "react";
import { getPackageTypeLabel, parseCsvText } from "../lib/csvValidation";
import { listQuestionSets, saveQuestionSet } from "../lib/database";
import { useAppStore } from "../store/appStore";

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
  const { navigate, setDbError, setQuestionSets } = useAppStore();
  const [manifest, setManifest] = useState<MarketplaceManifest | null>(null);
  const [manifestSource, setManifestSource] = useState<"local" | "remote">("local");
  const [selectedId, setSelectedId] = useState("");
  const [loadError, setLoadError] = useState("");
  const [importState, setImportState] = useState<ImportState>({ id: "", message: "", status: "idle" });

  useEffect(() => {
    loadMarketplaceManifest()
      .then(({ manifest: nextManifest, source }) => {
        setManifest(nextManifest);
        setManifestSource(source);
        setSelectedId(nextManifest.items[0]?.id ?? "");
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
  const groupedItems = useMemo(() => groupMarketplaceItems(items), [items]);

  async function importMarketplaceItem(item: MarketplaceItem) {
    setImportState({ id: item.id, message: "Importing...", status: "loading" });
    try {
      const response = await fetch(resolveMarketplaceAssetPath(item.path, manifestSource));
      if (!response.ok) throw new Error(`Could not download ${item.filename} (${response.status}).`);
      const csvText = await response.text();
      const summary = parseCsvText(csvText);
      if (!summary.valid) {
        const firstError = summary.issues.find((issue) => issue.level === "error");
        throw new Error(firstError?.message ?? "This bundle is not valid and cannot be imported.");
      }
      const saved = await saveQuestionSet({
        name: item.title,
        description: `${item.collection}. ${item.description}`,
        questions: summary.questions,
        status: summary.issues.some((issue) => issue.level === "warning") ? "warning" : "valid",
        packageType: summary.packageType ?? undefined,
        sourceFilename: item.filename,
        rowCount: summary.rowCount,
        sectionCounts: summary.sectionCounts
      });
      const sets = await listQuestionSets();
      setQuestionSets(sets);
      setDbError(null);
      setImportState({ id: item.id, message: `Imported ${saved.name}`, status: "done" });
      navigate("preview", saved.id);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not import marketplace bundle.";
      setImportState({ id: item.id, message, status: "error" });
      setDbError(message);
    }
  }

  return (
    <div className="marketplace-layout grid gap-6">
      <section className="rounded-md border border-line bg-white p-6 shadow-panel">
        <div className="flex flex-wrap items-start gap-4 border-b border-line pb-6">
          <div className="flex h-14 w-14 items-center justify-center rounded-md bg-teal-50 text-2xl font-black text-teal-700">
            ⬇
          </div>
          <div>
            <div className="text-xs font-black uppercase tracking-wide text-teal-700">Local marketplace preview</div>
            <h2 className="mt-2 text-2xl font-semibold">SAT Question Set Marketplace</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              CSV bundles can be added directly to this app. Every bundle is listed at $0 and imports into local SQLite without saving to Downloads first.
            </p>
          </div>
        </div>

        {loadError ? (
          <div className="mt-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">{loadError}</div>
        ) : null}

        {!loadError && items.length === 0 ? (
          <div className="mt-6 text-sm text-muted">Loading marketplace bundles...</div>
        ) : null}

        <div className="mt-6 space-y-6">
          {groupedItems.map((group) => (
            <div key={group.collection}>
              <div className="mb-3 flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-base font-semibold">{group.collection}</h3>
                  <p className="mt-1 text-xs text-muted">{group.items.length} free bundles</p>
                </div>
                <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-bold text-teal-700">$0</span>
              </div>
              <div className="marketplace-card-grid grid gap-4">
                {group.items.map((item) => {
                  const isSelected = selectedItem?.id === item.id;
                  const isImporting = importState.status === "loading" && importState.id === item.id;
                  return (
                    <article
                      className={`rounded-md border bg-white p-4 transition ${
                        isSelected ? "border-teal-300 ring-2 ring-teal-100" : "border-line hover:border-teal-200"
                      }`}
                      key={item.id}
                    >
                      <button className="block w-full text-left" onClick={() => setSelectedId(item.id)} type="button">
                        <div className="flex items-start justify-between gap-4">
                          <div className="min-w-0">
                            <div className="inline-flex rounded-md bg-teal-50 px-3 py-1 text-xs font-bold text-teal-800">
                              {item.source === "generated-and-audited" ? "AUDITED" : "PDF"}
                            </div>
                            <h4 className="csv-name-wrap mt-3 text-base font-semibold">{item.title}</h4>
                            <p className="csv-name-wrap mt-1 text-xs text-muted">{item.filename}</p>
                          </div>
                        </div>
                        <p className="mt-4 text-sm leading-6 text-slate-600">{item.description}</p>
                      </button>
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                        <button
                          className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-300"
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
        <h3 className="text-base font-semibold">Preview checkout</h3>
        <p className="mt-4 text-sm leading-6 text-slate-600">
          No account, card, or payment provider is used. The selected CSV is fetched and inserted into local SQLite.
        </p>
        <div className="mt-4 rounded-md bg-teal-50 p-3 text-xs font-bold uppercase text-teal-700">
          Source: {manifestSource === "remote" ? "GitHub" : "Bundled local fallback"}
        </div>
        <div className="mt-6 rounded-md bg-slate-50 p-4 text-sm">
          <div className="text-xs font-bold uppercase text-slate-500">Selected bundle</div>
          <div className="csv-name-wrap mt-2 font-semibold">{selectedItem?.title ?? "No bundle selected"}</div>
          <div className="csv-name-wrap mt-1 text-xs text-muted">{selectedItem?.filename ?? ""}</div>
        </div>
        <div className="mt-4 rounded-md bg-slate-50 p-4 text-sm">
          <div className="text-xs font-bold uppercase text-slate-500">Preview price</div>
          <div className="mt-2 text-3xl font-black">$0</div>
        </div>
        {selectedItem ? (
          <button
            className="mt-6 w-full rounded-md bg-teal-700 px-4 py-3 text-sm font-semibold text-white hover:bg-teal-600 disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={importState.status === "loading" && importState.id === selectedItem.id}
            onClick={() => void importMarketplaceItem(selectedItem)}
            type="button"
          >
            Get selected for $0
          </button>
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
    return {
      manifest: await fetchMarketplaceManifest(MARKETPLACE_LOCAL_MANIFEST_URL),
      source: "local"
    };
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

function groupMarketplaceItems(items: MarketplaceItem[]): Array<{ collection: string; items: MarketplaceItem[] }> {
  const groups = new Map<string, MarketplaceItem[]>();
  items.forEach((item) => {
    groups.set(item.collection, [...(groups.get(item.collection) ?? []), item]);
  });
  return Array.from(groups.entries()).map(([collection, groupItems]) => ({ collection, items: groupItems }));
}
