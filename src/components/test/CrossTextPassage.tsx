import { StudentText } from "./StudentText";

export interface CrossTextParts {
  text1: string;
  text2: string;
}

export function splitCrossTextPassage(value: string): CrossTextParts | null {
  const input = String(value ?? "").replace(/\\n/g, "\n").trim();
  const marker = /^Text 2:\s*$/im;
  const text2Match = marker.exec(input);

  if (!/^Text 1:\s*$/im.test(input) || !text2Match || text2Match.index === undefined) return null;

  const text1 = input.slice(0, text2Match.index).replace(/^Text 1:\s*/i, "").trim();
  const text2 = input.slice(text2Match.index + text2Match[0].length).trim();
  return text1 && text2 ? { text1, text2 } : null;
}

export function CrossTextPassage({ parts }: { parts: CrossTextParts }) {
  return (
    <div className="mt-4 space-y-5 text-sm leading-7 text-slate-700">
      <section>
        <h3 className="text-xs font-semibold uppercase text-slate-500">Text 1</h3>
        <div className="mt-2 whitespace-pre-wrap">
          <StudentText>{parts.text1}</StudentText>
        </div>
      </section>
      <section>
        <h3 className="text-xs font-semibold uppercase text-slate-500">Text 2</h3>
        <div className="mt-2 whitespace-pre-wrap">
          <StudentText>{parts.text2}</StudentText>
        </div>
      </section>
    </div>
  );
}
