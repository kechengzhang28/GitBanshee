import { memo } from "react";
import type { CommitNode } from "../types";

const ROW_HEIGHT = 32;

interface MessageColumnProps {
  scrollTop: number;
  visibleRows: number;
  commits: CommitNode[];
}

function MessageColumn({ scrollTop, visibleRows, commits }: MessageColumnProps) {
  const firstRow = Math.floor(scrollTop / ROW_HEIGHT);
  const lastRow = Math.min(firstRow + visibleRows + 1, commits.length);

  const elements: React.ReactNode[] = [];

  for (let i = firstRow; i < lastRow; i++) {
    const c = commits[i];
    if (!c) continue;
    const top = i * ROW_HEIGHT - scrollTop;

    elements.push(
      <div
        key={c.hash}
        className="absolute left-0 flex h-[32px] items-center px-3"
        style={{ top, width: "100%" }}
      >
        <span className="truncate text-[13px] leading-[32px] text-gb-text">
          {c.message.split("\n")[0]}
        </span>
      </div>,
    );
  }

  return (
    <div className="relative flex-1 overflow-hidden" style={{ height: "100%" }}>
      {elements}
    </div>
  );
}

export default memo(MessageColumn);
