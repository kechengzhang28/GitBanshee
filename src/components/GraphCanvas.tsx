import { useEffect, useRef, useCallback } from "react";
import { useRepoStore } from "../stores/repoStore";
import type { CommitNode } from "../types";

const ROW_HEIGHT = 32;
const LANE_WIDTH = 24;
const NODE_RADIUS = 5;
const PADDING_X = 28;
const PADDING_TOP = 16;
const OVERSHOT_ROWS = 20;
const COMMIT_LIMIT = 500;

const BRANCH_COLORS = [
  "#58a6ff", "#3fb950", "#d29922", "#a371f7", "#f85149", "#39d353",
];

export default function GraphCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const path = useRepoStore((s) => s.path);
  const commits = useRepoStore((s) => s.commits);
  const loadCommits = useRepoStore((s) => s.loadCommits);
  const selectCommit = useRepoStore((s) => s.selectCommit);
  const selectedCommit = useRepoStore((s) => s.selectedCommit);

  const offsetRef = useRef(0);
  const loadingRef = useRef(false);
  const rafRef = useRef(0);

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
      containerRef.current?.scrollTo(0, 0);
      loadMore();
    }
  }, [path]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const dpr = window.devicePixelRatio || 1;
    const scrollLeft = container.scrollLeft;
    const scrollTop = container.scrollTop;
    const vw = container.clientWidth;
    const vh = container.clientHeight;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const root = getComputedStyle(document.documentElement);
    const bgColor = root.getPropertyValue("--gb-bg").trim() || "#0b0d0f";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
    ctx.fillStyle = bgColor;
    ctx.fillRect(scrollLeft, scrollTop, vw, vh);

    if (commits.length === 0) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const maxLane = Math.max(1, ...commits.map((c) => c.lane + 1));
    const firstRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSHOT_ROWS);
    const lastRow = Math.min(commits.length, Math.ceil((scrollTop + vh) / ROW_HEIGHT) + OVERSHOT_ROWS);
    const lineColor = root.getPropertyValue("--gb-border").trim() || "#2a2c33";

    try {
      for (let l = 0; l < maxLane; l++) {
        const x = l * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X;
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, firstRow * ROW_HEIGHT);
        ctx.lineTo(x, lastRow * ROW_HEIGHT);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      for (let i = firstRow; i < lastRow; i++) {
        const c = commits[i];
        if (!c) continue;

        const cx = c.lane * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X;
        const cy = i * ROW_HEIGHT + ROW_HEIGHT / 2;

        for (const ph of c.parents) {
          const pi = commits.findIndex((p) => p.hash === ph);
          if (pi === -1) continue;
          const pp = commits[pi];
          const px = pp.lane * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X;
          const py = pi * ROW_HEIGHT + ROW_HEIGHT / 2;

          ctx.strokeStyle = BRANCH_COLORS[c.lane % BRANCH_COLORS.length];
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          if (c.lane === pp.lane) {
            ctx.moveTo(cx, cy + NODE_RADIUS);
            ctx.lineTo(px, py - NODE_RADIUS);
          } else {
            const midY = (cy + py) / 2;
            ctx.moveTo(cx, cy + NODE_RADIUS);
            ctx.lineTo(cx, midY);
            ctx.lineTo(px, midY);
            ctx.lineTo(px, py - NODE_RADIUS);
          }
          ctx.stroke();
        }

        const isSel = selectedCommit?.hash === c.hash;
        const r = NODE_RADIUS + (isSel ? 3 : 0);

        if (isSel) {
          ctx.beginPath();
          ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
          ctx.fillStyle = BRANCH_COLORS[c.lane % BRANCH_COLORS.length];
          ctx.globalAlpha = 0.3;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.fillStyle = BRANCH_COLORS[c.lane % BRANCH_COLORS.length];
        ctx.fill();
      }
    } catch {
      // Drawing failed, skip frame
    }

    rafRef.current = requestAnimationFrame(draw);
  }, [commits, selectedCommit]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container || commits.length === 0) return;

    const dpr = window.devicePixelRatio || 1;
    const maxLane = Math.max(1, ...commits.map((c) => c.lane + 1));
    const cw = PADDING_X + maxLane * LANE_WIDTH + PADDING_X;
    const ch = commits.length * ROW_HEIGHT + PADDING_TOP;

    canvas.width = Math.max(container.clientWidth, cw) * dpr;
    canvas.height = Math.max(container.clientHeight, ch) * dpr;
    canvas.style.width = `${Math.max(container.clientWidth, cw)}px`;
    canvas.style.height = `${Math.max(container.clientHeight, ch)}px`;
  }, [commits]);

  useEffect(() => {
    resizeCanvas();
  }, [resizeCanvas]);

  const handleScroll = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;

    const visibleBottom = container.scrollTop + container.clientHeight;
    const contentBottom = commits.length * ROW_HEIGHT;
    if (visibleBottom > contentBottom - 400) loadMore();
  }, [commits.length, loadMore]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (!e.ctrlKey) return;
    e.preventDefault();
    // Normal wheel passes through to native scroll
    // Ctrl+wheel reserved for future zoom
  }, []);

  const screenToCommit = useCallback((clientX: number, clientY: number): CommitNode | null => {
    const container = containerRef.current;
    if (!container) return null;
    const rect = container.getBoundingClientRect();
    const x = clientX - rect.left + container.scrollLeft;
    const y = clientY - rect.top + container.scrollTop;
    for (const c of commits) {
      const dx = x - (c.lane * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X);
      const dy = y - (c.row * ROW_HEIGHT + ROW_HEIGHT / 2);
      if (dx * dx + dy * dy < 144) return c;
    }
    return null;
  }, [commits]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    selectCommit(screenToCommit(e.clientX, e.clientY) || null);
  }, [screenToCommit, selectCommit]);

  return (
    <div className="h-full w-full bg-gb-bg">
      <div
        ref={containerRef}
        className="h-full w-full overflow-auto"
        onScroll={handleScroll}
      >
        <canvas
          ref={canvasRef}
          className="block"
          onWheel={handleWheel}
          onClick={handleClick}
          style={{ cursor: "crosshair" }}
        />
      </div>
    </div>
  );
}
