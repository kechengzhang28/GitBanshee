import { useEffect, useRef, useCallback } from "react";
import { useRepoStore } from "../stores/repoStore";
import type { CommitNode } from "../types";

const ROW_HEIGHT = 32;
const LANE_WIDTH = 24;
const NODE_RADIUS = 5;
const LABEL_PADDING = 6;
const OVERSHOT_ROWS = 20;
const COMMIT_LIMIT = 500;

function cssVar(name: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

interface Point {
  x: number;
  y: number;
}

export default function GraphCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dimensionsRef = useRef({ w: 800, h: 600 });

  const path = useRepoStore((s) => s.path);
  const commits = useRepoStore((s) => s.commits);
  const loadCommits = useRepoStore((s) => s.loadCommits);
  const selectCommit = useRepoStore((s) => s.selectCommit);
  const selectedCommit = useRepoStore((s) => s.selectedCommit);

  const offsetRef = useRef(0);
  const panRef = useRef<Point>({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const hoveredRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

  const maxLane = Math.max(1, ...commits.map((c) => c.lane + 1));

  const colorForLane = useCallback((lane: number): string => {
    const idx = lane % 6;
    return cssVar(`--gb-branch-${idx}`) || cssVar("--gb-accent") || "#888";
  }, []);

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

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      dimensionsRef.current = { w: width, h: height };
      el.width = width * devicePixelRatio;
      el.height = height * devicePixelRatio;
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = devicePixelRatio;
    const { w, h } = dimensionsRef.current;
    const zoom = zoomRef.current;
    const pan = panRef.current;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(pan.x, pan.y);
    ctx.scale(zoom, zoom);

    const rowHeight = ROW_HEIGHT;
    const firstRow = Math.max(0, Math.floor(-pan.y / zoom / rowHeight) - OVERSHOT_ROWS);
    const lastRow = Math.min(
      commits.length,
      Math.ceil((h - pan.y / zoom) / rowHeight) + OVERSHOT_ROWS,
    );

    const rootStyle = getComputedStyle(document.documentElement);
    const bgColor = rootStyle.getPropertyValue("--gb-bg").trim() || "#1e1e2e";
    const lineColor = rootStyle.getPropertyValue("--gb-border").trim() || "#555";

    ctx.fillStyle = bgColor;
    ctx.fillRect(-pan.x / zoom, -pan.y / zoom, w / zoom, h / zoom);

    for (let l = 0; l < maxLane; l++) {
      const x = l * LANE_WIDTH + LANE_WIDTH / 2 + 40;
      ctx.strokeStyle = lineColor;
      ctx.lineWidth = 1 / zoom;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(x, firstRow * rowHeight);
      ctx.lineTo(x, lastRow * rowHeight);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    for (let i = firstRow; i < lastRow; i++) {
      const c = commits[i];
      if (!c) continue;

      const pos = {
        x: c.lane * LANE_WIDTH + LANE_WIDTH / 2 + 40,
        y: i * ROW_HEIGHT + ROW_HEIGHT / 2,
      };

      for (const parentHash of c.parents) {
        const pi = commits.findIndex((p) => p.hash === parentHash);
        if (pi === -1) continue;
        const pp = commits[pi];
        const pPos = {
          x: pp.lane * LANE_WIDTH + LANE_WIDTH / 2 + 40,
          y: pi * ROW_HEIGHT + ROW_HEIGHT / 2,
        };

        ctx.strokeStyle = colorForLane(c.lane);
        ctx.lineWidth = 1.5 / zoom;
        ctx.beginPath();
        if (c.lane === pp.lane) {
          ctx.moveTo(pos.x, pos.y + NODE_RADIUS);
          ctx.lineTo(pPos.x, pPos.y - NODE_RADIUS);
        } else {
          const midY = (pos.y + pPos.y) / 2;
          ctx.moveTo(pos.x, pos.y + NODE_RADIUS);
          ctx.lineTo(c.lane * LANE_WIDTH + LANE_WIDTH / 2 + 40, midY);
          ctx.lineTo(pp.lane * LANE_WIDTH + LANE_WIDTH / 2 + 40, midY);
          ctx.lineTo(pPos.x, pPos.y - NODE_RADIUS);
        }
        ctx.stroke();
      }

      const isSelected = selectedCommit?.hash === c.hash;
      const isHovered = hoveredRef.current === c.hash;
      const r = isSelected ? NODE_RADIUS + 3 : isHovered ? NODE_RADIUS + 1 : NODE_RADIUS;

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r + 3, 0, Math.PI * 2);
        ctx.fillStyle = colorForLane(c.lane);
        ctx.globalAlpha = 0.3;
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = colorForLane(c.lane);
      ctx.fill();

      if (c.hash === commits[0]?.hash) {
        const textColor = rootStyle.getPropertyValue("--gb-text-sec").trim() || "#888";
        ctx.fillStyle = textColor;
        ctx.font = `${11 / zoom}px sans-serif`;
        ctx.fillText("HEAD", pos.x + NODE_RADIUS + LABEL_PADDING, pos.y + 4);
      }
    }

    ctx.restore();
  }, [commits, selectedCommit, maxLane, colorForLane]);

  useEffect(() => {
    let animationId: number;
    let running = true;
    const render = () => {
      if (!running) return;
      draw();
      animationId = requestAnimationFrame(render);
    };
    render();
    return () => {
      running = false;
      cancelAnimationFrame(animationId);
    };
  }, [draw]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    if (e.ctrlKey) {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.9 : 1.1;
      zoomRef.current = Math.max(0.1, Math.min(5, zoomRef.current * delta));
    } else {
      panRef.current = {
        x: panRef.current.x - e.deltaX,
        y: panRef.current.y - e.deltaY,
      };
    }

    const h = dimensionsRef.current.h;
    const zoom = zoomRef.current;
    const visibleBottom = (-panRef.current.y + h) / zoom;
    const contentBottom = commits.length * ROW_HEIGHT;
    if (visibleBottom > contentBottom - 200) {
      loadMore();
    }
  }, [commits.length, loadMore]);

  const screenToCommit = useCallback(
    (clientX: number, clientY: number): CommitNode | null => {
      const canvas = canvasRef.current;
      if (!canvas) return null;
      const rect = canvas.getBoundingClientRect();
      const x = (clientX - rect.left - panRef.current.x) / zoomRef.current;
      const y = (clientY - rect.top - panRef.current.y) / zoomRef.current;

      for (const c of commits) {
        const pos = {
          x: c.lane * LANE_WIDTH + LANE_WIDTH / 2 + 40,
          y: c.row * ROW_HEIGHT + ROW_HEIGHT / 2,
        };
        const dx = x - pos.x;
        const dy = y - pos.y;
        if (dx * dx + dy * dy < (NODE_RADIUS + 8) * (NODE_RADIUS + 8)) {
          return c;
        }
      }
      return null;
    },
    [commits],
  );

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      const c = screenToCommit(e.clientX, e.clientY);
      selectCommit(c || null);
    },
    [screenToCommit, selectCommit],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      const c = screenToCommit(e.clientX, e.clientY);
      hoveredRef.current = c?.hash || null;
    },
    [screenToCommit],
  );

  return (
    <div className="relative h-full w-full">
      <canvas
        ref={canvasRef}
        className="absolute inset-0"
        onWheel={handleWheel}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        style={{ cursor: "crosshair" }}
      />
      {loadingRef.current && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded bg-gb-panel px-3 py-1 text-xs text-gb-text-muted">
          Loading...
        </div>
      )}
    </div>
  );
}
