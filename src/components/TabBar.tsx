import { useRepoStore } from "../stores/repoStore";

export default function TabBar() {
  const path = useRepoStore((s) => s.path);
  const openRepoPaths = useRepoStore((s) => s.openRepoPaths);

  if (openRepoPaths.length === 0) return null;

  return (
    <div className="flex h-9 items-center border-b border-gb-border bg-gb-toolbar px-1" data-tauri-drag-region>
      {openRepoPaths.map((p) => {
        const name = p.split(/[/\\]/).pop() || p;
        const isActive = p === path;
        return (
          <button
            key={p}
            className={`flex h-full items-center border-b-2 px-3 text-xs transition-colors ${
              isActive
                ? "border-gb-accent font-medium text-gb-accent"
                : "border-transparent text-gb-text-muted hover:text-gb-text"
            }`}
            onClick={() => useRepoStore.getState().openRepo(p)}
          >
            {name}
          </button>
        );
      })}
      <div className="flex-1" />
    </div>
  );
}
