import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useRepoStore } from "../stores/repoStore";
import type { BranchInfo } from "../types";
import BranchColumn from "./BranchColumn";
import GraphColumn from "./GraphColumn";
import MessageColumn from "./MessageColumn";

const ROW_HEIGHT = 32;
const LANE_WIDTH = 24;
const PADDING_X = 28;
const COMMIT_LIMIT = 500;

export default function CommitGraph() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const [scrollTop, setScrollTop] = useState(0);
  const [containerH, setContainerH] = useState(0);

  const path = useRepoStore((s) => s.path);
  const commits = useRepoStore((s) => s.commits);
  const branches = useRepoStore((s) => s.branches);
  const selectedCommit = useRepoStore((s) => s.selectedCommit);
  const loadCommits = useRepoStore((s) => s.loadCommits);
  const loadBranches = useRepoStore((s) => s.loadBranches);
  const selectCommit = useRepoStore((s) => s.selectCommit);
  const loadMore = useCallback(async () => {
    if (!path || loadingRef.current) return;
    loadingRef.current = true;
    await loadCommits(offsetRef.current, COMMIT_LIMIT);
    offsetRef.current += COMMIT_LIMIT;
    loadingRef.current = false;
  }, [path, loadCommits]);

  useEffect(() => {
    if (path) {
      offsetRef.current = 0;
      loadMore();
      loadBranches();
    }
  }, [path]);

  useEffect(() => {
    const el = overlayRef.current?.parentElement;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => {
      setContainerH(e.contentRect.height);
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
    const visibleBottom = el.scrollTop + el.clientHeight;
    const contentBottom = commits.length * ROW_HEIGHT;
    if (visibleBottom > contentBottom - 400) loadMore();
  }, [commits.length, loadMore]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const handleSelectCommit = useCallback(
    (commit: import("../types").CommitNode | null) => {
      selectCommit(commit);
    },
    [selectCommit],
  );

  const branchMap = useMemo(() => {
    const map = new Map<string, BranchInfo[]>();
    for (const b of branches) {
      if (b.target_commit) {
        const list = map.get(b.target_commit) || [];
        list.push(b);
        map.set(b.target_commit, list);
      }
    }
    return map;
  }, [branches]);

  const maxLane = useMemo(
    () => Math.max(1, ...commits.map((c) => c.lane + 1)),
    [commits],
  );

  const graphColW = Math.max(160, PADDING_X * 2 + maxLane * LANE_WIDTH);
  const visibleRows = Math.ceil(containerH / ROW_HEIGHT) + 1;
  const contentH = Math.max(commits.length * ROW_HEIGHT, containerH);

  const visibleCommits = useMemo(() => {
    if (commits.length === 0) return [];
    const first = Math.floor(scrollTop / ROW_HEIGHT);
    const last = Math.min(first + visibleRows, commits.length);
    const result: { commit: (typeof commits)[number]; top: number }[] = [];
    for (let i = first; i < last; i++) {
      result.push({
        commit: commits[i],
        top: i * ROW_HEIGHT - scrollTop,
      });
    }
    return result;
  }, [commits, scrollTop, visibleRows]);

  const selectedHash = selectedCommit?.hash ?? null;

  const handleRowWheel = useCallback((e: React.WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop += e.deltaY;
    if (e.shiftKey) el.scrollLeft += e.deltaY;
  }, []);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-gb-bg">
      <div className="flex shrink-0 items-center border-b border-gb-border text-[11px] font-medium uppercase tracking-wider text-gb-text-muted"
        style={{ height: 28, lineHeight: "28px" }}>
        <div className="shrink-0 border-r border-gb-border pl-3" style={{ width: 144, height: "100%" }}>
          Branch / Tag
        </div>
        <div
          className="shrink-0 border-r border-gb-border pl-2"
          style={{ width: graphColW, height: "100%" }}
        >
          Graph
        </div>
        <div className="flex-1 pl-3" style={{ height: "100%" }}>
          Commit Message
        </div>
      </div>

      <div className="relative flex-1 overflow-hidden">
        <div
          ref={scrollRef}
          className="h-full w-full overflow-auto"
        >
          <div style={{ height: contentH }} />
        </div>

        <div
          ref={overlayRef}
          className="pointer-events-none absolute inset-0"
        >
          <div className="flex h-full">
            <BranchColumn
              scrollTop={scrollTop}
              visibleRows={visibleRows}
              commits={commits}
              branchMap={branchMap}
            />
            <GraphColumn
              scrollTop={scrollTop}
              colWidth={graphColW}
            />
            <MessageColumn
              scrollTop={scrollTop}
              visibleRows={visibleRows}
              commits={commits}
            />
          </div>

          {visibleCommits.map(({ commit, top }) => (
            <div
              key={commit.hash}
              className={`pointer-events-auto absolute cursor-pointer ${
                commit.hash === selectedHash
                  ? "bg-white/[0.06]"
                  : "hover:bg-white/[0.04]"
              }`}
              style={{ top, height: ROW_HEIGHT, left: 0, right: 18 }}
              onClick={() => handleSelectCommit(commit)}
              onWheel={handleRowWheel}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
