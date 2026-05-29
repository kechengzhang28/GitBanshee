import { memo } from "react";
import { GitBranch, Tag, Monitor, Cloud } from "lucide-react";
import type { PositionedCommit } from "../types";
import VirtualList from "./VirtualList";
import { ROW_HEIGHT } from "./constants";

interface BranchColumnProps {
  scrollTop: number;
  visibleRows: number;
  commits: PositionedCommit[];
}

interface VisEntry {
  label: string;
  hasLocal: boolean;
  hasRemote: boolean;
  isTag: boolean;
  isDetached: boolean;
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
          const headRef = c.refs.find((r) => r.type === "head");
          const tagRefs = c.refs.filter((r) => r.type === "tag");

          const localBranchRefs = c.refs.filter(
            (r) => r.type === "branch" && !r.name.endsWith("/HEAD"),
          );
          const remoteBranchRefs = c.refs.filter(
            (r) => r.type === "remote_branch" && !r.name.endsWith("/HEAD"),
          );

          const localNames = new Set(localBranchRefs.map((r) => r.display_name));

          const entries: VisEntry[] = [];

          for (const r of localBranchRefs) {
            const hasRemote = remoteBranchRefs.some((rr) => {
              const short = rr.display_name.split("/").slice(1).join("/");
              return short === r.display_name;
            });
            entries.push({ label: r.display_name, hasLocal: true, hasRemote, isTag: false, isDetached: false });
          }

          for (const r of remoteBranchRefs) {
            const short = r.display_name.split("/").slice(1).join("/");
            if (localNames.has(short)) continue;
            entries.push({ label: short, hasLocal: false, hasRemote: true, isTag: false, isDetached: false });
          }

          for (const r of tagRefs) {
            entries.push({ label: r.display_name, hasLocal: false, hasRemote: false, isTag: true, isDetached: false });
          }

          if (entries.length === 0 && headRef) {
            entries.push({ label: headRef.display_name, hasLocal: false, hasRemote: false, isTag: false, isDetached: true });
          }

          if (entries.length === 0) return null;

          return (
            <div className="flex flex-col justify-center h-full py-0.5">
              {entries.map((e, i) => {
                const accent = isHead && !e.isTag
                  ? { color: "var(--gb-accent)", fontWeight: "bold" as const }
                  : { color: c.color };

                return (
                  <div
                    key={i}
                    className="flex items-center gap-1 px-2 text-xs leading-5"
                    style={accent}
                  >
                    {e.isTag ? (
                      <Tag size={11} className="shrink-0" style={{ color: c.color }} />
                    ) : e.isDetached ? (
                      <GitBranch size={11} className="shrink-0" style={accent} />
                    ) : null}
                    <span className="truncate">{e.label}</span>
                    {!e.isTag && !e.isDetached && e.hasRemote && (
                      <Cloud size={13} className="shrink-0" style={{ color: c.color }} />
                    )}
                    {!e.isTag && !e.isDetached && e.hasLocal && (
                      <Monitor size={11} className="shrink-0" style={{ color: c.color }} />
                    )}
                  </div>
                );
              })}
            </div>
          );
        }}
      />
    </div>
  );
}

export default memo(BranchColumn);
