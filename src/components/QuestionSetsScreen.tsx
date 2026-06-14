import { useEffect, useState } from "react";
import { deleteQuestionSet, listQuestionSets } from "../lib/database";
import { useAppStore } from "../store/appStore";

export function QuestionSetsScreen() {
  const { questionSets, setQuestionSets, navigate, setDbError } = useAppStore();
  const [loading, setLoading] = useState(false);
  const [deletingSetId, setDeletingSetId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    setLoading(true);
    listQuestionSets()
      .then((sets) => {
        setQuestionSets(sets);
        setDbError(null);
      })
      .catch((error: unknown) =>
        setDbError(error instanceof Error ? error.message : "Could not load question sets.")
      )
      .finally(() => setLoading(false));
  }, [setDbError, setQuestionSets]);

  async function handleDelete(setId: number) {
    setDeletingSetId(setId);
    setDeleteError("");
    try {
      await deleteQuestionSet(setId);
      const sets = await listQuestionSets();
      setQuestionSets(sets);
      setDbError(null);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not delete question set.";
      setDeleteError(message);
      setDbError(message);
    } finally {
      setDeletingSetId(null);
    }
  }

  return (
    <section className="rounded-md border border-line bg-white shadow-panel">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Saved Question Sets</h2>
          <p className="mt-1 text-sm text-muted">Imported sets are stored in local SQLite.</p>
        </div>
      </div>

      {loading ? <div className="p-6 text-sm text-muted">Loading...</div> : null}
      {deleteError ? (
        <div className="mx-6 mt-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {deleteError}
        </div>
      ) : null}

      {!loading && questionSets.length === 0 ? (
        <div className="p-10 text-center">
          <h3 className="text-base font-semibold">No question sets yet</h3>
          <p className="mt-2 text-sm text-muted">Import a valid full-test CSV to begin.</p>
        </div>
      ) : null}

      {questionSets.length > 0 ? (
        <table className="w-full table-fixed border-collapse text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="w-[34%] px-6 py-3 font-semibold">Name</th>
              <th className="px-6 py-3 font-semibold">Imported</th>
              <th className="px-6 py-3 font-semibold">Questions</th>
              <th className="px-6 py-3 font-semibold">Status</th>
              <th className="px-6 py-3 font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {questionSets.map((set) => (
              <tr className="hover:bg-slate-50" key={set.id}>
                <td className="px-6 py-4">
                  <div className="csv-name-wrap font-semibold text-ink">{set.name}</div>
                  <div className="mt-1 text-xs text-muted">{set.description || "No description"}</div>
                </td>
                <td className="px-6 py-4 text-slate-600">{formatDate(set.importedAt)}</td>
                <td className="px-6 py-4 text-slate-600">{set.totalQuestions}</td>
                <td className="px-6 py-4">
                  <span className="rounded-md bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700">
                    {set.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <button
                      className="rounded-md border border-line px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-white"
                      onClick={() => navigate("preview", set.id)}
                      type="button"
                    >
                      Preview
                    </button>
                    <button
                      className="delete-gradient-button rounded-md px-3 py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={deletingSetId === set.id}
                      onClick={() => void handleDelete(set.id)}
                      type="button"
                    >
                      {deletingSetId === set.id ? "Deleting..." : "Delete"}
                    </button>
                    <button
                      className="rounded-md bg-teal-700 px-3 py-2 text-xs font-semibold text-white hover:bg-teal-600"
                      onClick={() => navigate("testOverview", set.id)}
                      type="button"
                    >
                      Start Test
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
}
