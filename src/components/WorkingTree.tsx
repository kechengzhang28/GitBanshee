import { useState } from "react";
import { useRepoStore } from "../stores/repoStore";
import { Check, Minus, Plus } from "lucide-react";

export default function WorkingTree() {
  const status = useRepoStore((s) => s.status);
  const loadingStatus = useRepoStore((s) => s.loadingStatus);
  const stageFile = useRepoStore((s) => s.stageFile);
  const unstageFile = useRepoStore((s) => s.unstageFile);
  const stageAll = useRepoStore((s) => s.stageAll);
  const createCommit = useRepoStore((s) => s.createCommit);
  const error = useRepoStore((s) => s.error);

  const [summary, setSummary] = useState("");
  const [description, setDescription] = useState("");
  const [amend, setAmend] = useState(false);
  const [committing, setCommitting] = useState(false);

  const staged = status.filter((s) => s.status === "staged");
  const unstaged = status.filter(
    (s) => s.status === "unstaged" || s.status === "untracked",
  );

  const handleCommit = async () => {
    if (!summary.trim()) return;
    if (!amend && staged.length === 0) return;
    setCommitting(true);
    try {
      await createCommit(summary.trim() + (description.trim() ? "\n\n" + description.trim() : ""), amend);
      setSummary("");
      setDescription("");
      setAmend(false);
    } finally {
      setCommitting(false);
    }
  };

  return (
    <div className="flex h-full flex-col border-t border-gb-border bg-gb-panel">
      <div className="flex shrink-0 items-start gap-2 p-2">
        <div className="flex flex-1 flex-col gap-1">
          <input
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="Summary (required)"
            className="rounded bg-gb-input px-2 py-1 text-xs text-gb-text placeholder-gb-text-muted outline-none focus:ring-1 focus:ring-gb-accent"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="rounded bg-gb-input px-2 py-1 text-xs text-gb-text placeholder-gb-text-muted outline-none focus:ring-1 focus:ring-gb-accent"
          />
        </div>
        <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
          <label className="flex items-center gap-1 text-xs text-gb-text-muted cursor-pointer">
            <input
              type="checkbox"
              checked={amend}
              onChange={(e) => setAmend(e.target.checked)}
              className="h-3 w-3"
            />
            Amend
          </label>
          <button
            onClick={handleCommit}
            disabled={committing || !summary.trim() || (!amend && staged.length === 0)}
            className="rounded bg-gb-accent px-3 py-1 text-xs font-medium text-white hover:brightness-110 disabled:opacity-50"
          >
            {committing ? "..." : "Commit"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-gb-danger/10 px-2 py-1 text-xs text-gb-danger">
          {error}
        </div>
      )}

      <div className="flex flex-1 overflow-hidden">
        <div className="flex flex-1 flex-col overflow-hidden border-t border-gb-border">
          <div className="flex shrink-0 items-center justify-between border-b border-gb-border px-3 py-1">
            <span className="text-xs font-semibold text-gb-text-sec">
              Staged ({staged.length})
            </span>
            <button
              onClick={stageAll}
              className="rounded px-1.5 py-0.5 text-xs text-gb-text-muted hover:bg-gb-hover hover:text-gb-text"
            >
              Stage all
            </button>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingStatus ? (
              <p className="p-2 text-xs text-gb-text-muted">Loading...</p>
            ) : staged.length === 0 ? (
              <p className="p-2 text-xs text-gb-text-muted">
                No staged changes
              </p>
            ) : (
              staged.map((f) => (
                <div
                  key={f.path}
                  className="flex h-6 items-center gap-1.5 px-3 text-xs hover:bg-gb-hover"
                >
                  <Check size={12} className="text-gb-success shrink-0" />
                  <span className="flex-1 truncate text-gb-text">{f.path}</span>
                  <button
                    onClick={() => unstageFile(f.path)}
                    className="flex shrink-0 items-center justify-center rounded p-0.5 text-gb-text-muted hover:bg-gb-hover hover:text-gb-danger"
                    title="Unstage"
                  >
                    <Minus size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex flex-1 flex-col overflow-hidden border-l border-t border-gb-border">
          <div className="flex shrink-0 items-center border-b border-gb-border px-3 py-1">
            <span className="text-xs font-semibold text-gb-text-sec">
              Changes ({unstaged.length})
            </span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loadingStatus ? (
              <p className="p-2 text-xs text-gb-text-muted">Loading...</p>
            ) : unstaged.length === 0 ? (
              <p className="p-2 text-xs text-gb-text-muted">
                Working tree clean
              </p>
            ) : (
              unstaged.map((f) => (
                <div
                  key={f.path}
                  className="flex h-6 items-center gap-1.5 px-3 text-xs hover:bg-gb-hover"
                >
                  <span
                    className={`shrink-0 ${
                      f.status === "untracked"
                        ? "text-gb-accent"
                        : "text-gb-warning"
                    }`}
                  >
                    {f.status === "untracked" ? "U" : "M"}
                  </span>
                  <span className="flex-1 truncate text-gb-text">{f.path}</span>
                  <button
                    onClick={() => stageFile(f.path)}
                    className="flex shrink-0 items-center justify-center rounded p-0.5 text-gb-text-muted hover:bg-gb-hover hover:text-gb-success"
                    title="Stage"
                  >
                    <Plus size={12} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
