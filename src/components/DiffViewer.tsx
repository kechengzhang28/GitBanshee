import type { DiffFile } from "../types";

interface Props {
  file: DiffFile | null;
}

export default function DiffViewer({ file }: Props) {
  if (!file) {
    return (
      <div className="flex h-full items-center justify-center bg-gb-bg">
        <p className="text-xs text-gb-text-muted">Select a file to view diff</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gb-bg">
      <div className="flex-1 overflow-auto font-mono text-[13px] leading-5">
        <div className="min-w-max">
          {file.hunks.map((hunk, hi) =>
            hunk.lines.map((line, li) => (
              <div
                key={`${hi}-${li}`}
                className={`flex min-h-[22px] items-center ${
                  line.kind === "addition"
                    ? "bg-[#1a3a2a]"
                    : line.kind === "deletion"
                      ? "bg-[#3a1a1a]"
                      : ""
                }`}
              >
              <span className="inline-block w-14 shrink-0 select-none pr-2 text-right text-gb-text-muted">
                {line.old_lineno ?? ""}
              </span>
              <span className="inline-block w-14 shrink-0 select-none pr-2 text-right text-gb-text-muted">
                {line.new_lineno ?? ""}
              </span>
              <span
                className={`w-5 shrink-0 select-none text-center font-bold ${
                  line.kind === "addition"
                    ? "text-[#4ade80]"
                    : line.kind === "deletion"
                      ? "text-[#f87171]"
                      : "text-gb-text-muted"
                }`}
              >
                {line.kind === "addition" ? "+" : line.kind === "deletion" ? "-" : " "}
              </span>
              <span
                className={`flex-1 whitespace-pre pr-3 ${
                  line.kind === "addition"
                    ? "text-[#4ade80]"
                    : line.kind === "deletion"
                      ? "text-[#f87171]"
                      : "text-gb-text"
                }`}
              >
                {line.content}
              </span>
            </div>
          )),
        )}
        </div>
      </div>
    </div>
  );
}
