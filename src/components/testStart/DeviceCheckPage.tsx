import { useState } from "react";
import { useAppStore } from "../../store/appStore";
import { NeonCheckbox } from "../ui/NeonCheckbox";

export function DeviceCheckPage() {
  const { navigate, selectedSetId } = useAppStore();
  const [checked, setChecked] = useState(false);
  return (
    <section className="safe-card-padding-lg mx-auto max-w-3xl rounded-md border border-line bg-white p-8 shadow-panel">
      <h2 className="text-2xl font-semibold">Local Device Check</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600">
        Confirm your keyboard, display, and local storage are ready. This check does not monitor or restrict your device.
      </p>
      <label className="safe-tile-padding mt-6 flex items-center gap-3 rounded-md border border-line bg-slate-50 p-4 text-sm font-semibold">
        <NeonCheckbox ariaLabel="Confirm local device check" checked={checked} onChange={setChecked} />
        I understand this is an unofficial local practice simulator.
      </label>
      {!checked ? (
        <div className="mt-2 text-xs text-muted">This confirmation is required before starting the module.</div>
      ) : null}
      <div className="mt-6 flex justify-between">
        <button className="rounded-md border border-line px-4 py-2 text-sm font-semibold" onClick={() => navigate("rulesAndTools", selectedSetId ?? undefined)} type="button">Back</button>
        <button className="rounded-md bg-teal-700 px-5 py-3 text-sm font-semibold text-white disabled:bg-slate-300" disabled={!checked} onClick={() => navigate("setup", selectedSetId ?? undefined)} type="button">
          Start Module
        </button>
      </div>
    </section>
  );
}
