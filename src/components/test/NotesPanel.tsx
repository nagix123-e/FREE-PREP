import { useEffect, useState } from "react";
import { getNote, saveNote } from "../../services/noteService";

export function NotesPanel({
  attemptId,
  onClose,
  questionId
}: {
  attemptId: number;
  onClose: () => void;
  questionId: number;
}) {
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getNote(attemptId, questionId)
      .then((record) => setNote(record?.note ?? ""))
      .catch((loadError: unknown) => {
        setNote("");
        setError(loadError instanceof Error ? loadError.message : "Could not load note.");
      });
  }, [attemptId, questionId]);

  async function handleSave() {
    setError("");
    setSaved(false);
    try {
      await saveNote({ attemptId, questionId, note });
      setSaved(true);
    } catch (saveError: unknown) {
      setError(saveError instanceof Error ? saveError.message : "Could not save note.");
    }
  }

  return (
    <aside className="fixed right-0 top-0 z-40 h-full w-96 border-l border-line bg-white p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Notes</h2>
        <button className="text-sm font-semibold text-slate-600" onClick={onClose} type="button">Close</button>
      </div>
      <textarea
        aria-label="Question notes"
        className="mt-4 h-80 w-full rounded-md border border-line p-3 text-sm"
        onChange={(event) => setNote(event.target.value)}
        placeholder="Write a note for this question"
        value={note}
      />
      <button className="mt-3 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white" onClick={() => void handleSave()} type="button">
        Save Note
      </button>
      {saved ? <div className="mt-3 text-sm text-teal-700">Note saved.</div> : null}
      {error ? <div className="mt-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}</div> : null}
    </aside>
  );
}
