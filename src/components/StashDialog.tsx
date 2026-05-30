import { useEffect } from "react";
import { useRepoStore, useStashes } from "../stores/repoStore";
import { Archive, ArrowUpFromLine, Copy, Trash2, X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function StashDialog({ open, onClose }: Props) {
  const stashes = useStashes();
  const loadStashes = useRepoStore((s) => s.loadStashes);
  const stashPop = useRepoStore((s) => s.stashPop);
  const stashApply = useRepoStore((s) => s.stashApply);
  const stashDrop = useRepoStore((s) => s.stashDrop);

  useEffect(() => {
    if (open) loadStashes();
  }, [open, loadStashes]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-96 rounded-lg border border-gb-border bg-gb-panel shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gb-border px-4 py-2">
          <span className="text-sm font-semibold text-gb-text">Stashes</span>
          <button
            onClick={onClose}
            className="text-gb-text-muted hover:text-gb-text"
          >
            <X size={14} />
          </button>
        </div>

        <div className="max-h-80 overflow-y-auto p-2">
          {stashes.length === 0 ? (
            <div className="py-4 text-center text-xs text-gb-text-muted">
              No stashes
            </div>
          ) : (
            stashes.map((s) => (
              <div
                key={s.index}
                className="group flex items-center gap-2 rounded px-2 py-1.5 hover:bg-gb-hover"
              >
                <Archive size={12} className="shrink-0 text-gb-text-muted" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs text-gb-text">
                    stash@&#123;{s.index}&#125;: {s.message}
                  </div>
                  <div className="text-[10px] text-gb-text-muted">
                    {s.oid.slice(0, 7)}
                  </div>
                </div>
                <div className="flex shrink-0 gap-0.5 opacity-0 group-hover:opacity-100">
                  <button
                    onClick={() => stashApply(s.index)}
                    className="rounded p-1 text-gb-text-muted hover:bg-gb-border hover:text-gb-text"
                    title="Apply"
                  >
                    <Copy size={12} />
                  </button>
                  <button
                    onClick={() => stashPop(s.index)}
                    className="rounded p-1 text-gb-text-muted hover:bg-gb-border hover:text-gb-accent"
                    title="Pop"
                  >
                    <ArrowUpFromLine size={12} />
                  </button>
                  <button
                    onClick={() => stashDrop(s.index)}
                    className="rounded p-1 text-gb-text-muted hover:bg-gb-border hover:text-gb-danger"
                    title="Drop"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
