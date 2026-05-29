import { useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useRepoStore } from "../stores/repoStore";

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
  const focusCommit = useRepoStore((s) => s.focusCommit);
  const focusedBranch = useRepoStore((s) => s.focusedBranch);
  const stashes = useRepoStore((s) => s.stashes);
  const loadStashes = useRepoStore((s) => s.loadStashes);
  const [open, setOpen] = useState<SectionState>({
    local: true,
    remote: false,
    tags: false,
    stashes: false,
  });

  useEffect(() => {
    if (path) {
      loadBranches();
      loadStashes();
    }
  }, [path, loadBranches, loadStashes]);

  const localBranches = branches.filter((b) => !b.is_remote);
  const remoteBranches = branches.filter((b) => b.is_remote && !b.name.endsWith("/HEAD"));
  const currentBranch = branches.find((b) => b.is_head);

  const toggle = (key: keyof SectionState) =>
    setOpen((s) => ({ ...s, [key]: !s[key] }));

  if (!path) return null;

  return (
    <div className="flex h-full flex-col overflow-auto border-r border-gb-border bg-gb-panel">
      <PanelHeader label="Branches" />
      <SectionHeader label="LOCAL" count={localBranches.length} open={open.local} onToggle={() => toggle("local")} />
      {open.local &&
        localBranches.map((b) => (
          <BranchRow
            key={b.name}
            name={b.name}
            active={b.is_head}
            current={currentBranch?.name === b.name}
            focused={focusedBranch === b.name}
            onClick={() => focusCommit(b.target_commit ?? "", b.name)}
            onDoubleClick={() => checkoutBranch(b.name)}
          />
        ))}
      <SectionHeader label="REMOTE" count={remoteBranches.length} open={open.remote} onToggle={() => toggle("remote")} />
      {open.remote &&
        remoteBranches.map((b) => (
          <BranchRow
            key={b.name}
            name={b.name}
            focused={focusedBranch === b.name}
            onClick={() => focusCommit(b.target_commit ?? "", b.name)}
            onDoubleClick={() => checkoutBranch(b.name)}
          />
        ))}
      <SectionHeader label="TAGS" count={0} open={open.tags} onToggle={() => toggle("tags")} />
      <SectionHeader label="STASHES" count={stashes.length} open={open.stashes} onToggle={() => toggle("stashes")} />
      {open.stashes &&
        stashes.map((s) => (
          <div
            key={s.index}
            className="flex h-7 cursor-pointer items-center gap-2 px-3 text-xs text-gb-text-muted hover:bg-gb-hover"
          >
            <span className="block h-1.5 w-1.5 shrink-0 rounded-full bg-gb-text-muted" />
            <span className="truncate">stash@&#123;{s.index}&#125;: {s.message}</span>
          </div>
        ))}
    </div>
  );
}

function PanelHeader({ label }: { label: string }) {
  return (
    <div className="flex h-7 items-center border-b border-gb-border px-3 text-xs font-semibold uppercase tracking-wider text-gb-text-muted">
      {label}
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
  focused,
  onClick,
  onDoubleClick,
}: {
  name: string;
  active?: boolean;
  current?: boolean;
  focused?: boolean;
  onClick?: () => void;
  onDoubleClick?: () => void;
}) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleClick = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      onDoubleClick?.();
    } else {
      timerRef.current = setTimeout(() => {
        timerRef.current = null;
        onClick?.();
      }, 300);
    }
  };

  const rowBg = focused && !current ? "bg-gb-hover" : "";
  const activeBg = current
    ? { backgroundColor: "color-mix(in srgb, var(--gb-accent) 12%, transparent)" as React.CSSProperties["backgroundColor"] }
    : undefined;

  return (
    <div
      onClick={handleClick}
      style={activeBg}
      className={`flex h-7 cursor-pointer items-center gap-2 px-3 text-xs ${rowBg} hover:bg-gb-hover`}
    >
      <span
        className="block h-2 w-2 shrink-0 rounded-full"
        style={{
          background: active ? "var(--gb-accent)" : "var(--gb-text-muted)",
        }}
      />
      <span
        className={`truncate ${active ? "font-bold text-gb-accent" : "text-gb-text-muted"}`}
      >
        {name}
      </span>
    </div>
  );
}
