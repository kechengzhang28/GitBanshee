import { useRepoStore } from "../stores/repoStore";

export default function TabBar() {
  const path = useRepoStore((s) => s.path);
  if (!path) return null;

  const name = path.split(/[/\\]/).pop() || path;

  return (
    <div className="flex h-9 items-center border-b border-gb-border bg-gb-toolbar px-3" data-tauri-drag-region>
      <span className="text-xs font-medium text-gb-accent">{name}</span>
      <div className="ml-2 flex h-6 w-6 cursor-pointer items-center justify-center rounded hover:bg-gb-hover">
        <span className="text-gb-text-muted">+</span>
      </div>
      <div className="flex-1" />
      <div className="flex h-6 w-6 cursor-pointer items-center justify-center rounded hover:bg-gb-hover">
        <span className="text-xs text-gb-text-muted">?</span>
      </div>
    </div>
  );
}
