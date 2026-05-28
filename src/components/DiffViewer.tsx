import type { DiffFile } from "../types";

const LINE_COLORS: Record<string, string> = {
  addition: "bg-gb-success/10 text-gb-text",
  deletion: "bg-gb-danger/10 text-gb-text",
  context: "text-gb-text",
};

const LINE_PREFIX: Record<string, string> = {
  addition: "text-gb-success",
  deletion: "text-gb-danger",
  context: "text-gb-text-muted",
};

interface Props {
  file: DiffFile | null;
}

export default function DiffViewer({ file }: Props) {
  if (!file) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-gb-text-muted">Select a file to view diff</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="shrink-0 border-b border-gb-border bg-gb-toolbar px-3 py-1 text-xs text-gb-text">
        {file.path}
      </div>
      <div className="flex-1 overflow-auto font-mono text-xs leading-5">
        {file.hunks.map((hunk, hi) => (
          <div key={hi}>
            <div className="sticky top-0 bg-gb-hover px-3 py-0.5 text-gb-text-sec">
              {hunk.header}
            </div>
            {hunk.lines.map((line, li) => (
              <div
                key={li}
                className={`flex min-h-[20px] ${LINE_COLORS[line.kind] ?? ""}`}
              >
                <span className="inline-block w-12 shrink-0 select-none pr-2 text-right text-gb-text-muted">
                  {line.old_lineno ?? ""}
                </span>
                <span className="inline-block w-12 shrink-0 select-none pr-2 text-right text-gb-text-muted">
                  {line.new_lineno ?? ""}
                </span>
                <span className={`w-4 shrink-0 select-none text-center ${LINE_PREFIX[line.kind] ?? "text-gb-text-muted"}`}>
                  {line.kind === "addition" ? "+" : line.kind === "deletion" ? "-" : " "}
                </span>
                <span className="flex-1 whitespace-pre">{line.content}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
