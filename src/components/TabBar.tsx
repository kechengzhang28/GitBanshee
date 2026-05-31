import { useState } from "react";
import { List, Plus, Settings, X } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { useRepoStore } from "../stores/repoStore";
import RepoListDialog from "./RepoListDialog";
import SettingsModal from "./SettingsModal";

export default function TabBar() {
  const [showRepoList, setShowRepoList] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
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
          <div key={p} className="flex min-w-0 shrink h-full items-center gap-0.5">
            {i > 0 && <Separator />}
            <div
              className={`flex h-7 min-w-0 items-center gap-0.5 rounded text-xs font-medium transition-colors ${
                isActive
                  ? "text-gb-accent"
                  : "text-gb-text-sec hover:bg-gb-hover hover:text-gb-text"
              }`}
            >
              <button
                className="min-w-0 flex-1 truncate h-full flex items-center pl-2 pr-1"
                onClick={() => useRepoStore.getState().switchTab(p)}
              >
                {name}
              </button>
              <button
                className="flex h-full shrink-0 items-center rounded px-1 text-gb-text-sec hover:text-gb-text"
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
      <div className="flex shrink-0 items-center gap-0.5">
        <button
          onClick={() => setShowRepoList(true)}
          className="flex h-7 w-7 items-center justify-center rounded text-gb-text-sec hover:bg-gb-hover hover:text-gb-text"
          title="Open repositories"
        >
          <List size={14} />
        </button>
        <button
          onClick={handleOpen}
          className="flex h-7 w-7 items-center justify-center rounded text-gb-text-sec hover:bg-gb-hover hover:text-gb-text"
          title="Open repository"
        >
          <Plus size={12} />
        </button>
        <div className="flex-1" data-tauri-drag-region />
        <Separator />
        <button
          onClick={() => setShowSettings(true)}
          className="flex h-7 w-7 items-center justify-center rounded text-gb-text-sec hover:bg-gb-hover hover:text-gb-text"
          title="Settings"
        >
          <Settings size={14} />
        </button>
      </div>
      <RepoListDialog open={showRepoList} onClose={() => setShowRepoList(false)} />
      <SettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

function Separator() {
  return <div className="mx-1 h-6 w-px shrink-0 bg-gb-border" />;
}
