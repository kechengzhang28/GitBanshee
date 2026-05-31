import { useEffect, useRef, useCallback, useMemo, useState } from "react";
import { useRepoStore, useCommits, useSelectedCommit, useScrollTarget } from "../stores/repoStore";
import type { PositionedCommit } from "../types";
import BranchColumn from "./BranchColumn";
import GraphColumn from "./GraphColumn";
import MessageColumn from "./MessageColumn";
import ContextMenu, { type ContextMenuItem } from "./ContextMenu";
import { ROW_HEIGHT, LANE_WIDTH, PADDING_X, COMMIT_LIMIT,
  SCROLL_THRESHOLD, BRANCH_COL_WIDTH, HEADER_HEIGHT,
  ZOOM_MIN, ZOOM_MAX, ZOOM_STEP, ZOOM_STEP_OUT,
  MIN_GRAPH_COL_WIDTH } from "./constants";

interface Props {
  zoomLevel?: number;
  onZoomChange?: (z: number) => void;
  onToggleDetail?: () => void;
}

export default function CommitGraph({ zoomLevel = 1, onZoomChange, onToggleDetail }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const rafRef = useRef(0);
  const [viewport, setViewport] = useState({ scrollTop: 0, containerH: 0, scrollbarW: 0 });

  const path = useRepoStore((s) => s.path);
  const commits = useCommits();
  const selectedCommit = useSelectedCommit();
  const loadCommits = useRepoStore((s) => s.loadCommits);
  const loadBranches = useRepoStore((s) => s.loadBranches);
  const selectCommit = useRepoStore((s) => s.selectCommit);
  const scrollTarget = useScrollTarget();

  const commitsLenRef = useRef(0);
  commitsLenRef.current = commits.length;

  const loadMore = useCallback(async () => {
    if (!path || loadingRef.current) return;
    loadingRef.current = true;
    const count = await loadCommits(offsetRef.current, COMMIT_LIMIT);
    offsetRef.current = count;
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
    if (!scrollTarget) return;
    const idx = commits.findIndex((c) => c.sha === scrollTarget);
    if (idx === -1) return;
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = idx * ROW_HEIGHT;
    useRepoStore.setState((state) => {
      if (!state.path || !state.tabs[state.path]) return {};
      return { tabs: { ...state.tabs, [state.path]: { ...state.tabs[state.path], scrollTarget: null } } };
    });
  }, [scrollTarget, commits]);

  useEffect(() => {
    const el = overlayRef.current?.parentElement;
    const sc = scrollRef.current;
    if (!el || !sc) return;

    let pendingH = 0;
    let pendingST = 0;
    let pendingSB = 0;

    const onContainerResize = ([e]: ResizeObserverEntry[]) => {
      pendingH = e.contentRect.height;
      schedule();
    };

    const onScrollbarResize = () => {
      const sbw = sc.offsetWidth - sc.clientWidth;
      if (sbw !== pendingSB) {
        pendingSB = sbw;
        schedule();
      }
    };

    const onScroll = () => {
      pendingST = sc.scrollTop;
      onScrollbarResize();
      schedule();
      const visibleBottom = sc.scrollTop + sc.clientHeight;
      if (visibleBottom > commitsLenRef.current * ROW_HEIGHT - SCROLL_THRESHOLD) {
        loadMoreRef.current();
      }
    };

    let scheduled = false;
    const schedule = () => {
      if (scheduled) return;
      scheduled = true;
      rafRef.current = requestAnimationFrame(() => {
        scheduled = false;
        setViewport({ scrollTop: pendingST, containerH: pendingH, scrollbarW: pendingSB });
      });
    };

    const containerObs = new ResizeObserver(onContainerResize);
    containerObs.observe(el);
    const scrollObs = new ResizeObserver(onScrollbarResize);
    scrollObs.observe(sc);
    sc.addEventListener("scroll", onScroll, { passive: true });

    pendingH = el.clientHeight;
    pendingSB = sc.offsetWidth - sc.clientWidth;
    schedule();

    return () => {
      cancelAnimationFrame(rafRef.current);
      containerObs.disconnect();
      scrollObs.disconnect();
      sc.removeEventListener("scroll", onScroll);
    };
  }, []);

  const selectedSha = selectedCommit?.sha ?? null;

  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number; commit: PositionedCommit;
  } | null>(null);

  const handleRowClick = useCallback(
    (commit: PositionedCommit) => {
      if (commit.dot_type === "uncommitted") return;
      const isSel = commit.sha === selectedSha;
      if (!isSel) {
        selectCommit(commit);
        return;
      }
      onToggleDetail?.();
    },
    [selectedSha, selectCommit, onToggleDetail],
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, commit: PositionedCommit) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY, commit });
    }, []
  );

  const maxLane = useMemo(
    () => Math.max(1, ...commits.map((c) => c.col + 1)),
    [commits],
  );

  const { scrollTop, containerH, scrollbarW } = viewport;
  const effectiveLaneW = LANE_WIDTH * zoomLevel;

  const autoGraphW = useMemo(
    () => Math.max(MIN_GRAPH_COL_WIDTH, PADDING_X * 2 + maxLane * effectiveLaneW),
    [maxLane, effectiveLaneW],
  );
  const [manualGraphW, setManualGraphW] = useState<number | null>(null);
  const visualGraphW = manualGraphW ?? autoGraphW;
  const canvasGraphW = Math.max(visualGraphW, autoGraphW);
  const graphColWRef = useRef(visualGraphW);
  graphColWRef.current = visualGraphW;

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


  const handleRowWheel = useCallback((e: React.WheelEvent) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop += e.deltaY;
  }, []);

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = graphColWRef.current;

    const onMove = (ev: MouseEvent) => {
      setManualGraphW(Math.max(MIN_GRAPH_COL_WIDTH, startW + ev.clientX - startX));
    };
    const onUp = () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    };

    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }, []);

  return (
    <div className="flex h-full w-full flex-col overflow-hidden bg-gb-bg">
      <div className="flex shrink-0 items-center border-b border-gb-border bg-gb-panel text-xs font-semibold uppercase tracking-wider text-gb-text-sec"
        style={{ height: HEADER_HEIGHT, lineHeight: `${HEADER_HEIGHT}px` }}>
        <div className="shrink-0 border-r border-gb-border pl-3" style={{ width: BRANCH_COL_WIDTH, height: "100%" }}>
          Branch
        </div>
        <div
          className="relative shrink-0 border-r border-gb-border pl-2"
          style={{ width: visualGraphW, height: "100%" }}
        >
          Graph
          <div
            className="absolute right-0 top-0 h-full w-1 cursor-col-resize hover:bg-gb-accent/40"
            style={{ marginRight: -0.5 }}
            onMouseDown={handleResizeStart}
          />
        </div>
        <div className="min-w-0 flex-1 truncate pl-3" style={{ height: "100%" }}>
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
              const factor = e.deltaY < 0 ? ZOOM_STEP : ZOOM_STEP_OUT;
              onZoomChange(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoomLevel * factor)));
            }
          }}
        >
          <div style={{ height: contentH }} />
        </div>

        <div
          ref={overlayRef}
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ right: scrollbarW }}
        >
          <div className="relative z-[1] flex h-full">
            <BranchColumn
              scrollTop={scrollTop}
              visibleRows={visibleRows}
              commits={commits}
            />
            <GraphColumn
              scrollTop={scrollTop}
              colWidth={visualGraphW}
              contentWidth={canvasGraphW}
              zoomLevel={zoomLevel}
              onRowClick={handleRowClick}
              onRowContextMenu={handleContextMenu}
              onWheel={handleRowWheel}
            />
            <MessageColumn
              scrollTop={scrollTop}
              visibleRows={visibleRows}
              commits={commits}
            />
          </div>

          {visibleCommits.map(({ commit, top }) => {
            const laneColor = commit.color;
            const isSel = commit.sha === selectedSha;
            return (
              <div
                key={commit.sha}
                className="pointer-events-auto absolute cursor-pointer"
                style={{
                  top,
                  height: ROW_HEIGHT,
                  left: 0,
                  right: 0,
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
                onClick={() => handleRowClick(commit)}
                onContextMenu={(e) => handleContextMenu(e, commit)}
                onWheel={handleRowWheel}
              />
            );
          })}
        </div>
      </div>
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          items={buildContextMenuItems(
            contextMenu.commit,
            () => setContextMenu(null)
          )}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  );
}

function buildContextMenuItems(
  commit: PositionedCommit,
  onDone: () => void
): ContextMenuItem[] {
  const store = useRepoStore.getState();
  return [
    { label: "Cherry Pick", shortcut: "Ctrl+Shift+P",
      onClick: () => { store.cherryPick(commit.sha); onDone(); } },
    { label: "Checkout Commit",
      onClick: () => { store.checkoutCommit(commit.sha); onDone(); } },
    { label: "Copy SHA",
      onClick: () => { navigator.clipboard.writeText(commit.sha); onDone(); } },
    { separator: true },
    { label: "Create Branch Here",
      onClick: () => { onDone(); } },
  ];
}
