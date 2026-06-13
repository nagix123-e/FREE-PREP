import { useEffect, useState } from "react";
import { listReviewList, removeFromReviewList } from "../services/reviewListService";
import { useAppStore } from "../store/appStore";
import type { ReviewListItem } from "../types";

export function ReviewListPage() {
  const { navigate } = useAppStore();
  const [items, setItems] = useState<ReviewListItem[]>([]);

  useEffect(() => {
    void refresh();
  }, []);

  async function refresh() {
    setItems(await listReviewList());
  }

  async function handleRemove(questionId: number) {
    await removeFromReviewList(questionId);
    await refresh();
  }

  return (
    <section className="rounded-md border border-line bg-white shadow-panel">
      <div className="flex items-center justify-between border-b border-line px-6 py-4">
        <div>
          <h2 className="text-lg font-semibold">Review List</h2>
          <p className="mt-1 text-sm text-muted">Saved questions for later review and practice.</p>
        </div>
        <button className="rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => navigate("reviewListPractice")} type="button">
          Review List Practice
        </button>
      </div>
      {items.length === 0 ? <div className="p-8 text-sm text-muted">No saved questions yet.</div> : null}
      {items.length > 0 ? (
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Question ID</th>
              <th className="px-5 py-3">Created</th>
              <th className="px-5 py-3">Priority</th>
              <th className="px-5 py-3">Note</th>
              <th className="px-5 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {items.map((item) => (
              <tr key={item.id}>
                <td className="px-5 py-3">{item.questionId}</td>
                <td className="px-5 py-3">{new Date(item.createdAt).toLocaleString()}</td>
                <td className="px-5 py-3">{item.priority}</td>
                <td className="px-5 py-3">{item.note}</td>
                <td className="px-5 py-3 text-right">
                  <button className="rounded-md border border-red-200 px-3 py-2 text-xs font-semibold text-red-700" onClick={() => void handleRemove(item.questionId)} type="button">
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}
