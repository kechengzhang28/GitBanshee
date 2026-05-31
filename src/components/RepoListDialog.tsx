import { useEffect } from "react";
import { useRepoStore } from "../stores/repoStore";
import { FolderGit2, Plus, Trash2, X } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function RepoListDialog({ open: dialogOpen, onClose }: Props) {
  const path = useRepoStore((s) => s.path);
  const openRepoPaths = useRepoStore((s) => s.openRepoPaths);
  const switchTab = useRepoStore((s) => s.switchTab);

  useEffect(() => {
    if (!dialogOpen) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [dialogOpen, onClose]);

  if (!dialogOpen) return null;

  const handleSelect = (p: string) => {
    switchTab(p);
    onClose();
  };

  const handleOpen = async () => {
    const dir = await open({ directory: true, multiple: false, title: "Select a Git repository" });
    if (dir && typeof dir === "string") {
      useRepoStore.getState().openRepo(dir);
    }
  };

  const handleClose = (e: React.MouseEvent, p: string) => {
    e.stopPropagation();
    useRepoStore.getState().closeTab(p);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-[560px] rounded-lg border border-gb-border bg-gb-panel shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gb-border px-4 py-2.5">
          <span className="text-sm font-semibold text-gb-text">Open Repositories</span>
          <button
            onClick={onClose}
            className="text-gb-text-muted hover:text-gb-text"
          >
            <X size={14} />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto p-2">
          {openRepoPaths.length === 0 ? (
            <p className="px-2 py-4 text-center text-xs text-gb-text-muted">
              No repositories open
            </p>
          ) : (
            openRepoPaths.map((p) => {
              const name = p.split(/[/\\]/).pop() || p;
              const isActive = p === path;
              return (
                <div
                  key={p}
                  onClick={() => handleSelect(p)}
                  className={`flex cursor-pointer items-center gap-2 rounded px-2 py-2 text-xs transition-colors ${
                    isActive
                      ? "bg-gb-accent/15 text-gb-accent"
                      : "text-gb-text hover:bg-gb-hover"
                  }`}
                >
                  <FolderGit2 size={14} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="truncate block font-medium">{name}</span>
                    <span className="truncate block text-[10px] text-gb-text-muted">{p}</span>
                  </div>
                  <button
                    onClick={(e) => handleClose(e, p)}
                    className="shrink-0 rounded p-1 text-gb-text-muted hover:text-gb-danger"
                    title="Close repository"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        <div className="border-t border-gb-border p-2.5">
          <button
            onClick={handleOpen}
            className="flex w-full items-center justify-center gap-2 rounded bg-gb-input px-3 py-2 text-xs text-gb-text-sec hover:bg-gb-hover hover:text-gb-text transition-colors"
          >
            <Plus size={14} />
            Open Repository
          </button>
        </div>
      </div>
    </div>
  );
}
