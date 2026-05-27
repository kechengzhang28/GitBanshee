import { useRepoStore } from "../stores/repoStore";

interface Props {
  onSelect: (path: string) => void;
  selectedPath: string | null;
}

export default function FileExplorer({ onSelect, selectedPath }: Props) {
  const diff = useRepoStore((s) => s.diff);
  if (!diff) return null;

  return (
    <div className="flex flex-col">
      <p className="px-3 py-2 text-xs font-semibold text-gb-text-muted">
        Changed Files ({diff.files.length})
      </p>
      <div className="flex flex-col">
        {diff.files.map((f) => (
          <button
            key={f.path}
            onClick={() => onSelect(f.path)}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs hover:bg-gb-hover ${
              selectedPath === f.path ? "bg-gb-hover" : ""
            }`}
          >
            <span className={statusColor(f.status)}>{statusIcon(f.status)}</span>
            <span className="truncate font-mono text-[11px] text-gb-text">
              {f.path}
            </span>
            <span className="ml-auto shrink-0 text-[10px]">
              <span className="text-gb-success">+{f.additions}</span>
              <span className="mx-0.5" />
              <span className="text-gb-danger">-{f.deletions}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function statusIcon(status: string): string {
  switch (status) {
    case "added": return "+";
    case "deleted": return "-";
    case "renamed": return "R";
    default: return "M";
  }
}

function statusColor(status: string): string {
  switch (status) {
    case "added": return "text-gb-success";
    case "deleted": return "text-gb-danger";
    case "renamed": return "text-gb-warning";
    default: return "text-gb-warning";
  }
}
