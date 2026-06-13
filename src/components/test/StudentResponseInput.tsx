export function StudentResponseInput({
  value,
  onChange
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="mt-6 block text-sm font-semibold text-slate-700">
      Student Response
      <input
        className="mt-2 w-full rounded-md border border-line px-3 py-3 text-lg font-semibold outline-none focus:border-teal-600"
        inputMode="decimal"
        onChange={(event) => onChange(event.target.value)}
        placeholder="Integer, decimal, fraction, or negative number"
        value={value}
      />
    </label>
  );
}
