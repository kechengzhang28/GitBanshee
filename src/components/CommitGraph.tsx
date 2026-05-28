import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useRepoStore } from "../stores/repoStore";
import type { CommitNode } from "../types";
import BranchColumn from "./BranchColumn";
import GraphColumn from "./GraphColumn";
import MessageColumn from "./MessageColumn";
import { ROW_HEIGHT, LANE_WIDTH, PADDING_X, COMMIT_LIMIT, BRANCH_COLORS } from "./constants";

interface Props {
  zoomLevel?: number;
  onZoomChange?: (z: number) => void;
}

export default function CommitGraph({ zoomLevel = 1, onZoomChange }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const rafRef = useRef(0);
  const [viewport, setViewport] = useState({ scrollTop: 0, containerH: 0 });

  const path = useRepoStore((s) => s.path);
  const commits = useRepoStore((s) => s.commits);
  const selectedCommit = useRepoStore((s) => s.selectedCommit);
  const loadCommits = useRepoStore((s) => s.loadCommits);
  const loadBranches = useRepoStore((s) => s.loadBranches);
  const selectCommit = useRepoStore((s) => s.selectCommit);

  const commitsLenRef = useRef(0);
  commitsLenRef.current = commits.length;

  const loadMore = useCallback(async () => {
    if (!path || loadingRef.current) return;
    loadingRef.current = true;
    await loadCommits(offsetRef.current, COMMIT_LIMIT);
    offsetRef.current += COMMIT_LIMIT;
    loadingRef.current = false;
  }, [path, loadCommits]);

  const loadMoreRef = useRef(loadMore);
  loadMoreRef.current = loadMore;

  useEffect(() => {
    if (path) {
      offsetRef.current = 0;
      loadMore();
      loadBranches();
    }
  }, [path, loadMore, loadBranches]);

  useEffect(() => {
    const el = overlayRef.current?.parentElement;
    const sc = scrollRef.current;
    if (!el || !sc) return;

    let pendingH = 0;
    let pendingST = 0;

    const onResize = ([e]: ResizeObserverEntry[]) => {
      pendingH = e.contentRect.height;
      schedule();
    };

    const onScroll = () => {
      pendingST = sc.scrollTop;
      schedule();
      const visibleBottom = sc.scrollTop + sc.clientHeight;
      if (visibleBottom > commitsLenRef.current * ROW_HEIGHT - 400) {
        loadMoreRef.current();
      }
    };

    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      rafRef.current = requestAnimationFrame(() => {
        scheduled = false;
        setViewport({ scrollTop: pendingST, containerH: pendingH });
      });
    };

    const obs = new ResizeObserver(onResize);
    obs.observe(el);
    sc.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      cancelAnimationFrame(rafRef.current);
      obs.disconnect();
      sc.removeEventListener("scroll", onScroll);
    };
  }, []);

  const handleSelectCommit = useCallback(
    (commit: CommitNode | null) => {
      selectCommit(commit);
    },
    [selectCommit],
  );

  const maxLane = useMemo(
    () => Math.max(1, ...commits.map((c) => c.lane + 1)),
    [commits],
  );

  const { scrollTop, containerH } = viewport;
  const effectiveLaneW = LANE_WIDTH * zoomLevel;
  const graphColW = Math.max(160, PADDING_X * 2 + maxLane * effectiveLaneW);
  const visibleRows = containerH > 0 ? Math.ceil(containerH / ROW_HEIGHT) + 1 : 20;
  const contentRows = commits.length * ROW_HEIGHT;
  const contentH = contentRows > 0 ? contentRows + 1 : containerH;

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
      <div className="flex shrink-0 items-center border-b border-gb-border text-xs font-medium uppercase tracking-wider text-gb-text-muted"
        style={{ height: 28, lineHeight: "28px" }}>
        <div className="shrink-0 border-r border-gb-border pl-3" style={{ width: 144, height: "100%" }}>
          Branch
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
          onWheel={(e) => {
            if (e.ctrlKey && onZoomChange) {
              e.preventDefault();
              const factor = e.deltaY < 0 ? 1.1 : 0.9;
              onZoomChange(Math.min(2.5, Math.max(0.4, zoomLevel * factor)));
            }
          }}
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
            />
            <GraphColumn
              scrollTop={scrollTop}
              colWidth={graphColW}
              zoomLevel={zoomLevel}
            />
            <MessageColumn
              scrollTop={scrollTop}
              visibleRows={visibleRows}
              commits={commits}
            />
          </div>

          {visibleCommits.map(({ commit, top }) => {
            const laneColor = BRANCH_COLORS[commit.lane % BRANCH_COLORS.length];
            const isSel = commit.hash === selectedHash;
            return (
              <div
                key={commit.hash}
                className="pointer-events-auto absolute cursor-pointer"
                style={{
                  top,
                  height: ROW_HEIGHT,
                  left: 0,
                  right: 18,
                  backgroundColor: isSel ? laneColor + "26" : undefined,
                }}
                onMouseEnter={(e) => {
                  if (!isSel) {
                    (e.target as HTMLElement).style.backgroundColor = laneColor + "14";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSel) {
                    (e.target as HTMLElement).style.backgroundColor = "";
                  }
                }}
                onClick={() => handleSelectCommit(commit)}
                onWheel={handleRowWheel}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
