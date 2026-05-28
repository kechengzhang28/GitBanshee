import { useRepoStore } from "../stores/repoStore";

interface Props {
  zoomLevel?: number;
}

export default function StatusBar({ zoomLevel = 1 }: Props) {
  const path = useRepoStore((s) => s.path);
  const commitCount = useRepoStore((s) => s.commitCount);
  const branches = useRepoStore((s) => s.branches);
  const current = branches.find((b) => b.is_head);

  if (!path) return null;

  return (
    <div className="flex h-7 items-center gap-4 border-t border-gb-border bg-gb-toolbar px-3 text-xs text-gb-text-muted">
      <span>{path}</span>
      <span>{current?.name || ""}</span>
      <span>{commitCount.toLocaleString()} commits</span>
      <div className="flex-1" />
      <span>Zoom: {Math.round(zoomLevel * 100)}%</span>
    </div>
  );
}
