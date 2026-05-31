import type { DiffFile, DiffLine } from "../types";

interface Props {
  file: DiffFile | null;
  wrap?: boolean;
}

function DiffLineRow({ line, wrap }: { line: DiffLine; wrap: boolean }) {
  const bgClass =
    line.kind === "addition"
      ? "bg-[#1a3a2a]"
      : line.kind === "deletion"
        ? "bg-[#3a1a1a]"
        : "";

  const signClass =
    line.kind === "addition"
      ? "text-[#4ade80]"
      : line.kind === "deletion"
        ? "text-[#f87171]"
        : "text-gb-text-muted";

  const textClass =
    line.kind === "addition"
      ? "text-[#4ade80]"
      : line.kind === "deletion"
        ? "text-[#f87171]"
        : "text-gb-text";

  const sign = line.kind === "addition" ? "+" : line.kind === "deletion" ? "-" : " ";

  return (
    <div className={`flex min-h-[22px] ${wrap ? "items-start" : "items-center"} ${bgClass}`}>
      <span className="inline-block w-14 shrink-0 select-none pr-2 text-right text-gb-text-muted">
        {line.old_lineno ?? ""}
      </span>
      <span className="inline-block w-14 shrink-0 select-none pr-2 text-right text-gb-text-muted">
        {line.new_lineno ?? ""}
      </span>
      <span className={`w-5 shrink-0 select-none text-center font-bold ${signClass}`}>
        {sign}
      </span>
      <span
        className={`flex-1 pr-3 ${wrap ? "whitespace-pre-wrap break-all" : "whitespace-pre"} ${textClass}`}
      >
        {line.content}
      </span>
    </div>
  );
}

export default function DiffViewer({ file, wrap = false }: Props) {
  if (!file) {
    return (
      <div className="flex h-full items-center justify-center bg-gb-bg">
        <p className="text-xs text-gb-text-muted">Select a file to view diff</p>
      </div>
    );
  }

  const content = file.hunks.map((hunk, hi) =>
    hunk.lines.map((line, li) => (
      <DiffLineRow key={`${hi}-${li}`} line={line} wrap={wrap} />
    )),
  );

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gb-bg">
      <div className="flex-1 overflow-auto font-mono text-[13px] leading-5">
        {wrap ? (
          content
        ) : (
          <div className="min-w-max">{content}</div>
        )}
      </div>
    </div>
  );
}
