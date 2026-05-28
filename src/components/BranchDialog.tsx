import { useState } from "react";
import { useRepoStore } from "../stores/repoStore";
import { GitBranch } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function BranchDialog({ open, onClose }: Props) {
  const branches = useRepoStore((s) => s.branches);
  const createBranch = useRepoStore((s) => s.createBranch);
  const deleteBranch = useRepoStore((s) => s.deleteBranch);
  const checkoutBranch = useRepoStore((s) => s.checkoutBranch);

  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleCreate = async () => {
    if (!name.trim()) return;
    setError(null);
    try {
      await createBranch(name.trim());
      setName("");
    } catch (e) {
      setError(String(e));
    }
  };

  const handleDelete = async (branchName: string) => {
    setError(null);
    try {
      await deleteBranch(branchName);
    } catch (e) {
      setError(String(e));
    }
  };

  const handleSwitch = async (branchName: string) => {
    setError(null);
    try {
      await checkoutBranch(branchName);
      onClose();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-80 rounded-lg border border-gb-border bg-gb-panel shadow-xl">
        <div className="flex items-center justify-between border-b border-gb-border px-4 py-2">
          <span className="text-sm font-semibold text-gb-text">Branches</span>
          <button
            onClick={onClose}
            className="text-gb-text-muted hover:text-gb-text text-xs"
          >
            Esc
          </button>
        </div>

        <div className="max-h-64 overflow-y-auto p-2">
          {branches.map((b) => (
            <div
              key={b.name}
              className={`flex h-7 items-center gap-2 rounded px-2 text-xs ${
                b.is_head ? "bg-gb-hover" : "hover:bg-gb-hover"
              }`}
            >
              <GitBranch
                size={12}
                className={b.is_head ? "text-gb-accent" : "text-gb-text-muted"}
              />
              <span
                className={`flex-1 cursor-pointer truncate ${
                  b.is_head ? "font-semibold text-gb-text" : "text-gb-text"
                }`}
                onClick={() => handleSwitch(b.name)}
              >
                {b.name}
              </span>
              {!b.is_head && (
                <button
                  onClick={() => handleDelete(b.name)}
                  className="shrink-0 text-gb-text-muted hover:text-gb-danger"
                  title="Delete branch"
                >
                  Delete
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="border-t border-gb-border p-2">
          <div className="flex gap-1.5">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
                if (e.key === "Escape") onClose();
              }}
              placeholder="New branch name"
              className="flex-1 rounded bg-gb-input px-2 py-1 text-xs text-gb-text placeholder-gb-text-muted outline-none focus:ring-1 focus:ring-gb-accent"
            />
            <button
              onClick={handleCreate}
              disabled={!name.trim()}
              className="rounded bg-gb-accent px-3 py-1 text-xs font-medium text-white hover:brightness-110 disabled:opacity-50"
            >
              Create
            </button>
          </div>
          {error && (
            <p className="mt-1 text-xs text-gb-danger">{error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
