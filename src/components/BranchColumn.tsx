import { memo } from "react";
import type { BranchInfo, CommitNode } from "../types";
import VirtualList from "./VirtualList";

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
  return (
    <div className="relative shrink-0 overflow-hidden" style={{ width: 144, height: "100%" }}>
      <VirtualList
        items={commits}
        rowHeight={ROW_HEIGHT}
        scrollTop={scrollTop}
        visibleRows={visibleRows}
        getKey={(c) => c.hash}
        renderItem={(c) => {
          const branches = branchMap.get(c.hash);
          if (!branches || branches.length === 0) return null;
          const color = BRANCH_COLORS[c.lane % BRANCH_COLORS.length];
          return (
            <div className="flex h-full items-center gap-1 px-2">
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
            </div>
          );
        }}
      />
    </div>
  );
}

export default memo(BranchColumn);
