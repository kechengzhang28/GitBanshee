import { memo } from "react";
import type { CommitNode } from "../types";
import VirtualList from "./VirtualList";
import { ROW_HEIGHT, BRANCH_COLORS } from "./constants";

interface BranchColumnProps {
  scrollTop: number;
  visibleRows: number;
  commits: CommitNode[];
}

function BranchColumn({ scrollTop, visibleRows, commits }: BranchColumnProps) {
  return (
    <div className="relative shrink-0 overflow-hidden" style={{ width: 144, height: "100%" }}>
      <VirtualList
        items={commits}
        rowHeight={ROW_HEIGHT}
        scrollTop={scrollTop}
        visibleRows={visibleRows}
        getKey={(c) => c.hash}
        renderItem={(c) => {
          if (!c.branches || c.branches.length === 0) return null;
          const color = BRANCH_COLORS[c.lane % BRANCH_COLORS.length];
          return (
            <div className="flex h-full items-center gap-1 px-2">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: color }}
              />
              <span
                className="truncate text-xs leading-[32px]"
                style={{ color }}
              >
                {c.branch_to_display}
              </span>
            </div>
          );
        }}
      />
    </div>
  );
}

export default memo(BranchColumn);
