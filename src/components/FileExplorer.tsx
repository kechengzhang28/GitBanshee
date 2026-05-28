import type { DiffFile } from "../types";

const STATUS_COLORS: Record<string, string> = {
  M: "text-gb-warning",
  A: "text-gb-success",
  D: "text-gb-danger",
  R: "text-gb-accent",
};

interface Props {
  files: DiffFile[];
  selectedFile: string | null;
  onSelect: (path: string) => void;
}

export default function FileExplorer({ files, selectedFile, onSelect }: Props) {
  return (
    <div className="flex flex-col">
      {files.map((f) => (
        <div
          key={f.path}
          onClick={() => onSelect(f.path)}
          className={`flex h-7 cursor-pointer items-center gap-2 px-3 text-xs ${
            f.path === selectedFile ? "bg-gb-hover" : "hover:bg-gb-hover"
          }`}
        >
          <span className={`w-4 text-center font-mono font-bold ${STATUS_COLORS[f.status] ?? "text-gb-text-muted"}`}>
            {f.status}
          </span>
          <span className="truncate text-gb-text">{f.path}</span>
          <div className="flex-1" />
          {f.additions > 0 && (
            <span className="shrink-0 text-gb-success">+{f.additions}</span>
          )}
          {f.deletions > 0 && (
            <span className="shrink-0 text-gb-danger">-{f.deletions}</span>
          )}
        </div>
      ))}
    </div>
  );
}
