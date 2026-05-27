import BranchSelector from "./BranchSelector";

export default function RepoToolbar() {
  return (
    <div className="flex h-10 items-center gap-3 border-b border-gb-border bg-gb-toolbar px-3">
      <BranchSelector />
      <div className="flex-1" />
      <span className="text-xs text-gb-text-muted">v0.1</span>
    </div>
  );
}
