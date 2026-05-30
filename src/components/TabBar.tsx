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
    <div className="flex h-9 items-center border-b border-gb-border bg-gb-toolbar px-1" data-tauri-drag-region>
      {openRepoPaths.map((p) => {
        const name = p.split(/[/\\]/).pop() || p;
        const isActive = p === path;
        return (
          <div
            key={p}
            className={`flex h-full shrink-0 items-center gap-0.5 text-xs transition-colors ${
              isActive
                ? "font-bold text-gb-accent"
                : "text-gb-text-muted hover:text-gb-text"
            }`}
          >
            <button
              className="flex h-full items-center pl-3"
              onClick={() => useRepoStore.getState().switchTab(p)}
            >
              {name}
            </button>
            <button
              className="flex h-full items-center px-1 text-[#6b7280] hover:text-gb-text"
              onClick={(e) => { e.stopPropagation(); useRepoStore.getState().closeTab(p); }}
              title="Close tab"
            >
              <X size={14} strokeWidth={2} />
            </button>
          </div>
        );
      })}
      <button
        onClick={handleOpen}
        className="ml-0.5 flex h-full items-center px-1.5 text-[#6b7280] hover:text-gb-text"
        title="Open repository"
      >
        <Plus size={16} strokeWidth={2} />
      </button>
      <div className="flex-1" data-tauri-drag-region />
    </div>
  );
}
