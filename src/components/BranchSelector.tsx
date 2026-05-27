import { useEffect } from "react";
import { useRepoStore } from "../stores/repoStore";

export default function BranchSelector() {
  const path = useRepoStore((s) => s.path);
  const branches = useRepoStore((s) => s.branches);
  const loadBranches = useRepoStore((s) => s.loadBranches);

  useEffect(() => {
    if (path) loadBranches();
  }, [path]);

  const current = branches.find((b) => b.is_head);

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-gb-text-sec">Branch:</span>
      <span className="rounded bg-gb-input px-2 py-0.5 text-sm text-gb-text">
        {current?.name || "main"}
      </span>
    </div>
  );
}
