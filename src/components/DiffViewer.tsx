import { useRepoStore } from "../stores/repoStore";
import type { DiffFile } from "../types";

interface Props {
  file: DiffFile | null;
}

export default function DiffViewer({ file }: Props) {
  const diff = useRepoStore((s) => s.diff);

  if (!file) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs text-gb-text-muted">
          {diff ? "Select a file to view diff" : "No diff loaded"}
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-auto">
      <div className="p-2 text-xs font-mono text-gb-text-muted border-b border-gb-border">
        {file.path}
      </div>
      {file.hunks.map((hunk, hi) => (
        <div key={hi} className="text-xs border-b border-gb-border/30">
          <div className="px-2 py-0.5 font-mono text-[10px] text-gb-accent bg-gb-toolbar">
            {hunk.header}
          </div>
          {hunk.lines.map((line, li) => (
            <div
              key={li}
              className={`flex font-mono text-[11px] leading-5 ${
                line.kind === "addition"
                  ? "bg-gb-success/15"
                  : line.kind === "deletion"
                    ? "bg-gb-danger/15"
                    : ""
              }`}
            >
              <span className="inline-block w-8 select-none px-1 text-right text-gb-text-muted">
                {line.old_lineno ?? ""}
              </span>
              <span className="inline-block w-8 select-none px-1 text-right text-gb-text-muted border-l border-gb-border/30">
                {line.new_lineno ?? ""}
              </span>
              <span
                className={`flex-1 whitespace-pre px-2 ${
                  line.kind === "addition"
                    ? "text-gb-success"
                    : line.kind === "deletion"
                      ? "text-gb-danger"
                      : "text-gb-text"
                }`}
              >
                {line.kind === "addition"
                  ? "+"
                  : line.kind === "deletion"
                    ? "-"
                    : " "}
                {line.content}
              </span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
