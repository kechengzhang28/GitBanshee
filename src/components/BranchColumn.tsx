import { memo } from "react";
import type { BranchInfo, CommitNode } from "../types";

const ROW_HEIGHT = 32;
const BRANCH_COLORS = [
  "#58a6ff", "#3fb950", "#d29922", "#a371f7", "#f85149", "#39d353",
];

interface BranchColumnProps {
  scrollTop: number;
  visibleRows: number;
  commits: CommitNode[];
  branchMap: Map<string, BranchInfo[]>;
}

function BranchColumn({ scrollTop, visibleRows, commits, branchMap }: BranchColumnProps) {
  const firstRow = Math.floor(scrollTop / ROW_HEIGHT);
  const lastRow = Math.min(firstRow + visibleRows + 1, commits.length);

  const elements: React.ReactNode[] = [];

  for (let i = firstRow; i < lastRow; i++) {
    const c = commits[i];
    if (!c) continue;
    const branches = branchMap.get(c.hash);
    if (!branches || branches.length === 0) continue;

    const top = i * ROW_HEIGHT - scrollTop;
    const color = BRANCH_COLORS[c.lane % BRANCH_COLORS.length];

    elements.push(
      <div
        key={c.hash}
        className="absolute left-0 flex h-[32px] items-center gap-1 px-2"
        style={{ top, width: "100%" }}
      >
        <span
          className="inline-block h-2 w-2 shrink-0 rounded-full"
          style={{ backgroundColor: color }}
        />
        <span
          className="truncate text-xs leading-[32px]"
          style={{
            color,
            fontWeight: branches.some((b) => b.is_head) ? 600 : 400,
          }}
        >
          {branches[0].name}
        </span>
      </div>,
    );
  }

  return (
    <div
      className="relative shrink-0 overflow-hidden"
      style={{ width: 144, height: "100%" }}
    >
      {elements}
    </div>
  );
}

export default memo(BranchColumn);
