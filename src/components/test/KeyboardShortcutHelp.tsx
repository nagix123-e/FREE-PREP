export function KeyboardShortcutHelp({ onClose }: { onClose: () => void }) {
  const shortcuts = [
    ["Right Arrow", "Next"],
    ["Left Arrow", "Back"],
    ["A / B / C / D", "Select answer"],
    ["M", "Mark"],
    ["Q", "Open Question Menu"],
    ["E", "Eliminate selected choice"],
    ["P", "Pause"],
    ["Ctrl + Enter", "Submit Module"],
    ["T", "Toggle Timer"]
  ];

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35">
      <section className="shortcut-help-modal rounded-md border border-line bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Keyboard Shortcuts</h2>
          <button className="text-sm font-semibold text-slate-600" onClick={onClose} type="button">Close</button>
        </div>
        <div className="mt-5 space-y-2">
          {shortcuts.map(([keys, action]) => (
            <div className="flex items-center justify-between rounded-md border border-line bg-slate-50 p-3 text-sm" key={keys}>
              <span>{action}</span>
              <kbd className="rounded border border-line bg-white px-2 py-1 font-semibold">{keys}</kbd>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
