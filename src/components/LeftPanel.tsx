import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useRepoStore } from "../stores/repoStore";
import PanelHeader from "./PanelHeader";

interface SectionState {
  local: boolean;
  remote: boolean;
  tags: boolean;
  stashes: boolean;
}

export default function LeftPanel() {
  const path = useRepoStore((s) => s.path);
  const branches = useRepoStore((s) => s.branches);
  const loadBranches = useRepoStore((s) => s.loadBranches);
  const checkoutBranch = useRepoStore((s) => s.checkoutBranch);
  const [open, setOpen] = useState<SectionState>({
    local: true,
    remote: false,
    tags: false,
    stashes: false,
  });

  useEffect(() => {
    if (path) loadBranches();
  }, [path, loadBranches]);

  const localBranches = branches.filter((b) => !b.is_remote);
  const remoteBranches = branches.filter((b) => b.is_remote);
  const currentBranch = branches.find((b) => b.is_head);

  const toggle = (key: keyof SectionState) =>
    setOpen((s) => ({ ...s, [key]: !s[key] }));

  if (!path) return null;

  return (
    <div className="flex h-full flex-col overflow-auto border-r border-gb-border bg-gb-panel">
      <PanelHeader title="Branches" />
      {/* LOCAL */}
      <SectionHeader label="LOCAL" count={localBranches.length} open={open.local} onToggle={() => toggle("local")} />
      {open.local &&
        localBranches.map((b) => (
          <BranchRow
            key={b.name}
            name={b.name}
            active={b.is_head}
            current={currentBranch?.name === b.name}
            onClick={() => checkoutBranch(b.name)}
          />
        ))}
      {/* REMOTE */}
      <SectionHeader label="REMOTE" count={remoteBranches.length} open={open.remote} onToggle={() => toggle("remote")} />
      {open.remote &&
        remoteBranches.map((b) => (
          <BranchRow key={b.name} name={b.name} onClick={() => checkoutBranch(b.name)} />
        ))}
      {/* TAGS */}
      <SectionHeader label="TAGS" count={0} open={open.tags} onToggle={() => toggle("tags")} />
      {/* STASHES */}
      <SectionHeader label="STASHES" count={0} open={open.stashes} onToggle={() => toggle("stashes")} />
    </div>
  );
}

function SectionHeader({
  label,
  count,
  open,
  onToggle,
}: {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className="flex h-7 cursor-pointer items-center gap-1.5 px-3 text-xs text-gb-text-muted hover:text-gb-text"
      onClick={onToggle}
    >
      {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      <span className="font-semibold tracking-wider">{label}</span>
      <div className="mx-1 flex-1 border-t border-gb-border" />
      <span>{count}</span>
    </div>
  );
}

function BranchRow({
  name,
  active,
  current,
  onClick,
}: {
  name: string;
  active?: boolean;
  current?: boolean;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex h-7 cursor-pointer items-center gap-2 px-3 text-xs ${
        current ? "bg-gb-hover" : ""
      } hover:bg-gb-hover`}
    >
      <span
        className="block h-2 w-2 rounded-full"
        style={{
          background: active ? "var(--gb-accent)" : "var(--gb-text-muted)",
        }}
      />
      <span className={active ? "text-gb-text" : "text-gb-text-muted"}>
        {name}
      </span>
    </div>
  );
}
