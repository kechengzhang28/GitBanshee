import { useEffect, useRef, useState } from "react";
import { useRepoStore, useBranches, useFocusedBranch, useStashes, useTags } from "../stores/repoStore";
import PanelHeader from "./PanelHeader";
import SectionHeader from "./SectionHeader";

interface SectionState {
  local: boolean;
  remote: boolean;
  tags: boolean;
  stashes: boolean;
}

export default function LeftPanel() {
  const path = useRepoStore((s) => s.path);
  const branches = useBranches();
  const loadBranches = useRepoStore((s) => s.loadBranches);
  const checkoutBranch = useRepoStore((s) => s.checkoutBranch);
  const focusCommit = useRepoStore((s) => s.focusCommit);
  const focusedBranch = useFocusedBranch();
  const stashes = useStashes();
  const loadStashes = useRepoStore((s) => s.loadStashes);
  const tags = useTags();
  const loadTags = useRepoStore((s) => s.loadTags);
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
      loadTags();
    }
  }, [path, loadBranches, loadStashes, loadTags]);

  const localBranches = branches.filter((b) => !b.is_remote);
  const remoteBranches = branches.filter((b) => b.is_remote && !b.name.endsWith("/HEAD"));
  const currentBranch = branches.find((b) => b.is_head);

  const toggle = (key: keyof SectionState) =>
    setOpen((s) => ({ ...s, [key]: !s[key] }));

  if (!path) return null;

  return (
    <div className="flex h-full flex-col overflow-auto border-r border-gb-border bg-gb-panel">
      <PanelHeader title="Branches" />
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
      <SectionHeader label="TAGS" count={tags.length} open={open.tags} onToggle={() => toggle("tags")} />
      {open.tags &&
        tags.map((t) => (
          <div
            key={t.name}
            onClick={() => focusCommit(t.target_commit, t.name)}
            className="flex h-7 cursor-pointer items-center gap-2 bg-gb-panel px-3 text-xs text-gb-text-muted hover:bg-gb-hover"
          >
            <span className="block h-2 w-2 shrink-0 rounded-full bg-gb-text-muted" />
            <span className="truncate">{t.display_name}</span>
          </div>
        ))}
      <SectionHeader label="STASHES" count={stashes.length} open={open.stashes} onToggle={() => toggle("stashes")} />
      {open.stashes &&
        stashes.map((s) => (
          <div
            key={s.index}
            className="flex h-7 cursor-pointer items-center gap-2 bg-gb-panel px-3 text-xs text-gb-text-muted hover:bg-gb-hover"
          >
            <span className="block h-1.5 w-1.5 shrink-0 rounded-full bg-gb-text-muted" />
            <span className="truncate">stash@&#123;{s.index}&#125;: {s.message}</span>
          </div>
        ))}
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
    ? { backgroundColor: "var(--gb-checked-out)" as React.CSSProperties["backgroundColor"] }
    : undefined;

  return (
    <div
      onClick={handleClick}
      style={activeBg}
      className={`flex h-7 cursor-pointer items-center gap-2 bg-gb-panel px-3 text-xs ${rowBg} hover:bg-gb-hover`}
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
