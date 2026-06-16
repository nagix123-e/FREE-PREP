import { getStringList } from "./chartUtils";

export function TableRenderer({
  data,
  tableMarkdown
}: {
  data: Record<string, unknown>;
  tableMarkdown?: string;
}) {
  const normalizedMarkdown = normalizeTableMarkdown(tableMarkdown);
  const parsedMarkdown = normalizedMarkdown ? parseMarkdownTable(normalizedMarkdown) : null;
  const headers = parsedMarkdown?.headers ?? getStringList(data.headers);
  const rows = parsedMarkdown?.rows ?? parseJsonRows(data.rows, headers);

  if (headers.length === 0 && rows.length === 0) {
    return null;
  }

  return (
    <div className="overflow-auto rounded-md border border-line bg-white">
      <table className="w-full border-collapse text-left text-sm">
        {headers.length > 0 ? (
          <thead className="bg-slate-100 text-xs uppercase text-slate-600">
            <tr>
              {headers.map((header) => (
                <th className="border border-line px-3 py-2 font-semibold" key={header}>
                  {header}
                </th>
              ))}
            </tr>
          </thead>
        ) : null}
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.map((cell, cellIndex) => (
                <td className="border border-line px-3 py-2" key={`${rowIndex}-${cellIndex}`}>
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function normalizeTableMarkdown(value?: string): string {
  return String(value || "").replace(/\\n/g, "\n").trim();
}

function parseMarkdownTable(markdown: string): { headers: string[]; rows: string[][] } | null {
  const lines = markdown
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.includes("|"));
  if (lines.length < 2) {
    return null;
  }

  const headers = splitMarkdownRow(lines[0]);
  const rows = lines
    .slice(1)
    .filter((line) => !/^:?-{3,}:?(?:\s*\|\s*:?-{3,}:?)*$/.test(line.replace(/^\|/, "").replace(/\|$/, "")))
    .map(splitMarkdownRow)
    .filter((row) => row.length > 0);

  return { headers, rows };
}

function splitMarkdownRow(line: string): string[] {
  return line
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function parseJsonRows(value: unknown, headers: string[]): string[][] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((row) => {
    if (Array.isArray(row)) {
      return row.map((cell) => String(cell));
    }
    if (typeof row === "object" && row !== null) {
      const record = row as Record<string, unknown>;
      return headers.length > 0
        ? headers.map((header) => String(record[header] ?? ""))
        : Object.values(record).map((cell) => String(cell));
    }
    return [String(row)];
  });
}
