import { memo } from "react";
import { GitBranch, Tag } from "lucide-react";
import type { PositionedCommit, RefInfo } from "../types";
import VirtualList from "./VirtualList";
import { ROW_HEIGHT } from "./constants";

interface BranchColumnProps {
  scrollTop: number;
  visibleRows: number;
  commits: PositionedCommit[];
}

function RefLabel({ r, color, active }: { r: RefInfo; color: string; active: boolean }) {
  const iconSize = 11;

  return (
    <div
      className={`flex items-center gap-1 px-2 text-xs leading-5 ${active ? "font-bold" : ""}`}
      style={{ color }}
    >
      {r.type === "tag" ? (
        <Tag size={iconSize} className="shrink-0" style={{ color }} />
      ) : (
        <GitBranch size={iconSize} className="shrink-0" style={{ color }} />
      )}
      <span className="truncate">{r.display_name}</span>
    </div>
  );
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

          const isHead = c.dot_type === "head";

          const branchRefs = c.refs.filter(
            (r) => r.type === "branch" || r.type === "remote_branch",
          );
          const tagRefs = c.refs.filter((r) => r.type === "tag");
          const headRef = c.refs.find((r) => r.type === "head");

          let visibleRefs: RefInfo[] = [...branchRefs, ...tagRefs];

          // Only show HEAD as separate label when detached (no branch refs)
          if (visibleRefs.length === 0 && headRef) {
            visibleRefs = [headRef];
          }

          if (visibleRefs.length === 0) return null;

          return (
            <div className="flex flex-col justify-center h-full py-0.5">
              {visibleRefs.map((r, i) => (
                <RefLabel
                  key={`${r.type}-${r.name}-${i}`}
                  r={r}
                  color={c.color}
                  active={isHead && r.type !== "tag"}
                />
              ))}
            </div>
          );
        }}
      />
    </div>
  );
}

export default memo(BranchColumn);
