import { useState } from "react";
import { useRepoStore, useBranches } from "../stores/repoStore";
import { GitBranch, Trash2 } from "lucide-react";
import Dialog from "./ui/Dialog";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function BranchDialog({ open, onClose }: Props) {
  const branches = useBranches();
  const createBranch = useRepoStore((s) => s.createBranch);
  const deleteBranch = useRepoStore((s) => s.deleteBranch);
  const checkoutBranch = useRepoStore((s) => s.checkoutBranch);

  const [name, setName] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    await createBranch(name.trim());
    setName("");
  };

  const handleDelete = async (branchName: string) => {
    const isHead = branches.find((b) => b.name === branchName)?.is_head;
    if (isHead) {
      const fallback = branches.find((b) => !b.is_head);
      if (fallback) await checkoutBranch(fallback.name);
    }
    await deleteBranch(branchName);
  };

  const handleSwitch = async (branchName: string) => {
    await checkoutBranch(branchName);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Branches">
      <div className="max-h-96 overflow-y-auto p-2">
        {branches.map((b) => (
          <div
            key={b.name}
            className="flex h-7 items-center gap-2 rounded px-2 text-xs hover:bg-gb-hover"
          >
            <GitBranch
              size={12}
              className={b.is_head ? "text-gb-accent" : "text-gb-text-muted"}
            />
            <span
              className={`flex-1 cursor-pointer truncate ${
                b.is_head ? "font-semibold text-gb-accent" : "text-gb-text"
              }`}
              onClick={() => handleSwitch(b.name)}
            >
              {b.name}
            </span>
            <button
              onClick={() => handleDelete(b.name)}
              className="shrink-0 rounded p-1 text-gb-text-muted hover:text-gb-danger"
              title="Delete branch"
            >
              <Trash2 size={12} />
            </button>
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
      </div>
    </Dialog>
  );
}
