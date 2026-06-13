import { useState } from "react";
import { calculateExpression } from "../../services/calculatorService";

export function CalculatorModal({ onClose }: { onClose: () => void }) {
  const [expression, setExpression] = useState("");
  const [result, setResult] = useState("");

  function append(value: string) {
    setExpression(`${expression}${value}`);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/35">
      <section className="w-96 rounded-md border border-line bg-white p-5 shadow-xl">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Calculator</h2>
          <button className="text-sm font-semibold text-slate-600" onClick={onClose} type="button">Close</button>
        </div>
        <input className="mt-4 w-full rounded-md border border-line px-3 py-2 text-lg" onChange={(event) => setExpression(event.target.value)} value={expression} />
        <div className="mt-2 rounded-md bg-slate-50 p-3 text-lg font-semibold">{result || "0"}</div>
        <div className="mt-4 grid grid-cols-4 gap-2">
          {["7", "8", "9", "/", "4", "5", "6", "*", "1", "2", "3", "-", "0", ".", "(", ")", "+", "√(", "^2"].map((key) => (
            <button className="rounded-md border border-line px-3 py-2 text-sm font-semibold hover:bg-slate-50" key={key} onClick={() => append(key)} type="button">{key}</button>
          ))}
          <button className="rounded-md border border-line px-3 py-2 text-sm font-semibold" onClick={() => setExpression("")} type="button">MC</button>
          <button className="col-span-3 rounded-md bg-teal-700 px-3 py-2 text-sm font-semibold text-white" onClick={() => setResult(calculateExpression(expression))} type="button">=</button>
        </div>
      </section>
    </div>
  );
}
