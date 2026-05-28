import { memo } from "react";
import type { CommitNode } from "../types";
import VirtualList from "./VirtualList";
import { ROW_HEIGHT } from "./constants";

interface MessageColumnProps {
  scrollTop: number;
  visibleRows: number;
  commits: CommitNode[];
}

function MessageColumn({ scrollTop, visibleRows, commits }: MessageColumnProps) {
  return (
    <div className="relative flex-1 overflow-hidden" style={{ height: "100%" }}>
      <VirtualList
        items={commits}
        rowHeight={ROW_HEIGHT}
        scrollTop={scrollTop}
        visibleRows={visibleRows}
        getKey={(c) => c.hash}
        renderItem={(c) => (
          <div className="flex h-full items-center px-3">
            <span className="truncate text-sm leading-[32px] text-gb-text">
              {c.message.split("\n")[0]}
            </span>
          </div>
        )}
      />
    </div>
  );
}

export default memo(MessageColumn);
