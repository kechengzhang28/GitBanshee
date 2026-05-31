import { useState } from "react";
import { useRepoStore, useBranches } from "../stores/repoStore";
import { GitBranch } from "lucide-react";
import Dialog from "./ui/Dialog";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function RebaseDialog({ open, onClose }: Props) {
  const branches = useBranches();
  const rebaseStart = useRepoStore((s) => s.rebaseStart);
  const rebaseContinue = useRepoStore((s) => s.rebaseContinue);
  const rebaseAbort = useRepoStore((s) => s.rebaseAbort);
  const currentBranch = branches.find((b) => b.is_head);

  const [selected, setSelected] = useState("");

  const localBranches = branches.filter(
    (b) => !b.is_remote && !b.is_head
  );

  const handleRebase = async () => {
    if (!selected) return;
    await rebaseStart(selected);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} title="Rebase" width="w-80">
      <div className="p-3">
        <p className="mb-2 text-xs text-gb-text-muted">
          Rebase <span className="font-semibold text-gb-accent">{currentBranch?.name ?? "HEAD"}</span> onto:
        </p>

        <div className="max-h-48 overflow-y-auto rounded border border-gb-border">
          {localBranches.map((b) => (
            <div
              key={b.name}
              onClick={() => setSelected(b.name)}
              className={`flex h-7 cursor-pointer items-center gap-2 px-2 text-xs hover:bg-gb-hover ${
                selected === b.name ? "bg-gb-hover text-gb-accent" : "text-gb-text"
              }`}
            >
              <GitBranch size={12} />
              <span className="truncate">{b.name}</span>
            </div>
          ))}
        </div>

        <div className="mt-3 flex gap-1.5">
          <button
            onClick={handleRebase}
            disabled={!selected}
            className="flex-1 rounded bg-gb-accent px-3 py-1.5 text-xs font-medium text-white hover:brightness-110 disabled:opacity-50"
          >
            Rebase
          </button>
          <button
            onClick={() => { rebaseContinue(); onClose(); }}
            className="rounded bg-gb-border px-2 py-1.5 text-xs text-gb-text hover:bg-gb-hover"
            title="Continue rebase after resolving conflicts"
          >
            Continue
          </button>
          <button
            onClick={() => { rebaseAbort(); onClose(); }}
            className="rounded bg-gb-border px-2 py-1.5 text-xs text-gb-danger hover:bg-gb-hover"
          >
            Abort
          </button>
        </div>
      </div>
    </Dialog>
  );
}
