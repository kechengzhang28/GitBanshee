import { useRepoStore, useCommitCount, useBranches, useStatus } from "../stores/repoStore";

interface Props {
  zoomLevel?: number;
}

export default function StatusBar({ zoomLevel = 1 }: Props) {
  const path = useRepoStore((s) => s.path);
  const commitCount = useCommitCount();
  const branches = useBranches();
  const status = useStatus();
  const current = branches.find((b) => b.is_head);

  if (!path) return null;

  const staged = status.filter((s) => s.status === "staged").length;
  const modified = status.filter(
    (s) => s.status === "unstaged" || s.status === "untracked",
  ).length;

  return (
    <div className="flex h-7 items-center gap-4 border-t border-gb-border bg-gb-toolbar px-3 text-xs text-gb-text-muted">
      <span>{path}</span>
      <span>{current?.name || ""}</span>
      {(staged > 0 || modified > 0) && (
        <span>
          {staged > 0 && (
            <span className="text-gb-success">+{staged}</span>
          )}
          {staged > 0 && modified > 0 && <span> </span>}
          {modified > 0 && (
            <span className="text-gb-warning">~{modified}</span>
          )}
        </span>
      )}
      <span>{commitCount.toLocaleString()} commits</span>
      <div className="flex-1" />
      <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
    </div>
  );
}
