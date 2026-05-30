import { Plus, X } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useRepoStore } from "../stores/repoStore";

export default function TabBar() {
  const path = useRepoStore((s) => s.path);
  const openRepoPaths = useRepoStore((s) => s.openRepoPaths);

  if (openRepoPaths.length === 0) return null;

  const handleOpen = async () => {
    const dir = await open({ directory: true, multiple: false, title: "Select a Git repository" });
    if (dir && typeof dir === "string") {
      useRepoStore.getState().openRepo(dir);
    }
  };

  return (
    <div className="flex h-10 items-center gap-0.5 border-b border-gb-border bg-gb-toolbar px-2" data-tauri-drag-region>
      {openRepoPaths.map((p, i) => {
        const name = p.split(/[/\\]/).pop() || p;
        const isActive = p === path;
        return (
          <div key={p} className="flex h-full items-center gap-0.5">
            {i > 0 && <Separator />}
            <div
              className={`flex h-7 shrink-0 items-center gap-0.5 rounded text-xs font-medium transition-colors ${
                isActive
                  ? "text-gb-accent"
                  : "text-gb-text-sec hover:bg-gb-hover hover:text-gb-text"
              }`}
            >
              <button
                className="flex h-full items-center pl-2"
                onClick={() => useRepoStore.getState().switchTab(p)}
              >
                {name}
              </button>
              <button
                className="flex h-full items-center rounded px-1 text-gb-text-sec hover:text-gb-text"
                onClick={(e) => { e.stopPropagation(); useRepoStore.getState().closeTab(p); }}
                title="Close tab"
              >
                <X size={12} />
              </button>
            </div>
          </div>
        );
      })}
      <Separator />
      <button
        onClick={handleOpen}
        className="flex h-7 w-7 items-center justify-center rounded text-gb-text-sec hover:bg-gb-hover hover:text-gb-text"
        title="Open repository"
      >
        <Plus size={12} />
      </button>
      <div className="flex-1" data-tauri-drag-region />
    </div>
  );
}

function Separator() {
  return <div className="mx-1 h-6 w-px bg-gb-border" />;
}
