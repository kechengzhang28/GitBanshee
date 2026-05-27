import { useEffect, useRef, useCallback } from "react";
import { useRepoStore } from "../stores/repoStore";
import type { CommitNode } from "../types";

const ROW_HEIGHT = 32;
const LANE_WIDTH = 24;
const NODE_RADIUS = 5;
const PADDING_X = 40;
const OVERSHOT_ROWS = 20;
const COMMIT_LIMIT = 500;

const BRANCH_COLORS = [
  "#58a6ff", "#3fb950", "#d29922", "#a371f7", "#f85149", "#39d353",
];

export default function GraphCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const path = useRepoStore((s) => s.path);
  const commits = useRepoStore((s) => s.commits);
  const loadCommits = useRepoStore((s) => s.loadCommits);
  const selectCommit = useRepoStore((s) => s.selectCommit);
  const selectedCommit = useRepoStore((s) => s.selectedCommit);

  const offsetRef = useRef(0);
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
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
      loadMore();
    }
  }, [path]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const zoom = zoomRef.current;
    const pan = panRef.current;
    const root = getComputedStyle(document.documentElement);
    const bgColor = root.getPropertyValue("--gb-bg").trim() || "#0b0d0f";

    // Clear and fill background
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w * dpr, h * dpr);

    if (commits.length === 0) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const firstRow = Math.max(0, Math.floor(-pan.y / zoom / ROW_HEIGHT) - OVERSHOT_ROWS);
    const lastRow = Math.min(commits.length, Math.ceil((h - pan.y / zoom) / ROW_HEIGHT) + OVERSHOT_ROWS);
    const maxLane = Math.max(1, ...commits.map((c) => c.lane + 1));
    const lineColor = root.getPropertyValue("--gb-border").trim() || "#2a2c33";

    try {
      // Lane background lines
      for (let l = 0; l < maxLane; l++) {
        const x = l * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X;
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 1 / zoom;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(x, firstRow * ROW_HEIGHT);
        ctx.lineTo(x, lastRow * ROW_HEIGHT);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      // Connecting lines + nodes
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
          ctx.lineWidth = 1.5 / zoom;
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

    ctx.restore();
    rafRef.current = requestAnimationFrame(draw);
  }, [commits, selectedCommit]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    if (e.ctrlKey) {
      e.preventDefault();
      const oldZoom = zoomRef.current;
      const newZoom = Math.max(0.1, Math.min(5, oldZoom * (e.deltaY > 0 ? 0.9 : 1.1)));
      panRef.current = {
        x: mx - (mx - panRef.current.x) * (newZoom / oldZoom),
        y: my - (my - panRef.current.y) * (newZoom / oldZoom),
      };
      zoomRef.current = newZoom;
    } else {
      panRef.current = {
        x: panRef.current.x - e.deltaX,
        y: panRef.current.y - e.deltaY,
      };
    }

    const rect2 = e.currentTarget.getBoundingClientRect();
    const visibleBottom = (-panRef.current.y + rect2.height) / zoomRef.current;
    const contentBottom = commits.length * ROW_HEIGHT;
    if (visibleBottom > contentBottom - 200) loadMore();
  }, [commits.length, loadMore]);

  const screenToCommit = useCallback((clientX: number, clientY: number): CommitNode | null => {
    const el = canvasRef.current;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    const x = (clientX - rect.left - panRef.current.x) / zoomRef.current;
    const y = (clientY - rect.top - panRef.current.y) / zoomRef.current;
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
    <div className="relative h-full w-full bg-gb-bg">
      <canvas
        ref={canvasRef}
        className="absolute inset-0 size-full"
      />
      <div
        className="absolute inset-0"
        style={{ cursor: "crosshair" }}
        onWheel={handleWheel}
        onClick={handleClick}
      />
    </div>
  );
}
