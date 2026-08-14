import { StudentText } from "./StudentText";

export function ChoiceList({
  choices,
  eliminatedChoices,
  selectedAnswer,
  onSelect,
  onToggleEliminated
}: {
  choices: Array<{ letter: string; text: string }>;
  eliminatedChoices: string[];
  selectedAnswer: string;
  onSelect: (letter: string) => void;
  onToggleEliminated: (letter: string) => void;
}) {
  return (
    <div className="mt-6 space-y-3">
      {choices.map((choice) => {
        const eliminated = eliminatedChoices.includes(choice.letter);
        const selected = selectedAnswer === choice.letter;
        return (
          <div
            className={`flex items-start gap-3 rounded-md border p-4 ${
              selected ? "border-teal-300 bg-teal-50" : "border-line bg-white"
            } ${eliminated ? "opacity-55" : ""}`}
            key={choice.letter}
          >
            <label className="choice-checkbox mt-0.5" aria-label={`Select choice ${choice.letter}`}>
              <input
                checked={selected}
                onChange={() => onSelect(choice.letter)}
                type="checkbox"
              />
              <span className="checkmark" />
            </label>
            <button
              className={`min-w-0 flex-1 text-left text-sm leading-6 text-slate-800 ${
                eliminated ? "choice-text-eliminated" : ""
              }`}
              onClick={() => onSelect(choice.letter)}
              type="button"
            >
              <span className="mr-2 font-semibold">{choice.letter}</span>
              <span><StudentText>{choice.text}</StudentText></span>
            </button>
            <button
              className="rounded-md border border-line px-2 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              onClick={() => onToggleEliminated(choice.letter)}
              type="button"
            >
              {eliminated ? "Undo" : "Eliminate"}
            </button>
          </div>
        );
      })}
    </div>
  );
}
