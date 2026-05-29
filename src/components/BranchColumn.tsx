import { memo } from "react";
import type { PositionedCommit } from "../types";
import VirtualList from "./VirtualList";
import { ROW_HEIGHT } from "./constants";

interface BranchColumnProps {
  scrollTop: number;
  visibleRows: number;
  commits: PositionedCommit[];
}

function BranchColumn({ scrollTop, visibleRows, commits }: BranchColumnProps) {
  return (
    <div className="relative shrink-0 overflow-hidden" style={{ width: 144, height: "100%" }}>
      <VirtualList
        items={commits}
        rowHeight={ROW_HEIGHT}
        scrollTop={scrollTop}
        visibleRows={visibleRows}
        getKey={(c) => c.sha}
        renderItem={(c) => {
          if (!c.refs || c.refs.length === 0) return null;
          const branchRefs = c.refs.filter(r => r.type === "branch" || r.type === "remote_branch");
          if (branchRefs.length === 0) return null;
          const displayName = branchRefs[0].display_name;
          return (
            <div className="flex h-full items-center gap-1 px-2">
              <span
                className="inline-block h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: c.color }}
              />
              <span
                className="truncate text-xs leading-[32px]"
                style={{ color: c.color }}
              >
                {displayName}
              </span>
            </div>
          );
        }}
      />
    </div>
  );
}

export default memo(BranchColumn);
