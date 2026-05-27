import { useEffect, useRef, useCallback, useState } from "react";
import { useRepoStore } from "../stores/repoStore";
import type { CommitNode } from "../types";
import { initGl } from "../renderer/webgl";
import type { GlContext } from "../renderer/webgl";
import { drawBackground, drawConnectingLines, drawNodes } from "../renderer/primitives";

const ROW_HEIGHT = 32;
const LANE_WIDTH = 24;
const NODE_RADIUS = 5;
const PADDING_X = 40;
const OVERSHOT_ROWS = 20;
const COMMIT_LIMIT = 500;

const BRANCH_COLORS = [
  "#4FC3F7", "#81C784", "#FFB74D", "#CE93D8", "#E57373", "#4DD0E1",
];

export default function GraphCanvas() {
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const canvas2dRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<GlContext | null>(null);
  const dimensionsRef = useRef({ w: 800, h: 600 });
  const [useWebgl, setUseWebgl] = useState(true);

  const path = useRepoStore((s) => s.path);
  const commits = useRepoStore((s) => s.commits);
  const loadCommits = useRepoStore((s) => s.loadCommits);
  const selectCommit = useRepoStore((s) => s.selectCommit);
  const selectedCommit = useRepoStore((s) => s.selectedCommit);

  const offsetRef = useRef(0);
  const panRef = useRef({ x: 0, y: 0 });
  const zoomRef = useRef(1);
  const hoveredRef = useRef<string | null>(null);
  const loadingRef = useRef(false);

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
    const canvas = glCanvasRef.current;
    if (!canvas) return;
    try {
      glRef.current = initGl(canvas);
    } catch {
      setUseWebgl(false);
    }
  }, []);

  useEffect(() => {
    const el = glCanvasRef.current || canvas2dRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      dimensionsRef.current = { w: width, h: height };
      el.width = width * devicePixelRatio;
      el.height = height * devicePixelRatio;
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, [useWebgl]);

  useEffect(() => {
    let animId: number;
    let running = true;
    const render = () => {
      if (!running) return;
      if (useWebgl && glRef.current) {
        renderWebGL();
      } else if (!useWebgl) {
        renderCanvas2D();
      }
      animId = requestAnimationFrame(render);
    };
    render();
    return () => {
      running = false;
      cancelAnimationFrame(animId);
    };
  }, [commits, selectedCommit, useWebgl]);

  // ── WebGL Render ──

  const renderWebGL = useCallback(() => {
    const g = glRef.current;
    const canvas = glCanvasRef.current;
    if (!g || !canvas) return;

    const { gl } = g;
    const dpr = devicePixelRatio;
    const { w, h } = dimensionsRef.current;
    const zoom = zoomRef.current;
    const pan = panRef.current;

    gl.viewport(0, 0, w * dpr, h * dpr);
    gl.clearColor(0.102, 0.114, 0.137, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const firstRow = Math.max(0, Math.floor(-pan.y / zoom / ROW_HEIGHT) - OVERSHOT_ROWS);
    const lastRow = Math.min(commits.length, Math.ceil((h - pan.y / zoom) / ROW_HEIGHT) + OVERSHOT_ROWS);
    const maxLane = Math.max(1, ...commits.map((c) => c.lane + 1));

    drawBackground(g, pan.x, pan.y, zoom, w, h, firstRow, lastRow, maxLane, [0.18, 0.2, 0.24, 1]);
    drawConnectingLines(g, commits, firstRow, lastRow, pan.x, pan.y, zoom, w, h, BRANCH_COLORS);
    drawNodes(g, commits, firstRow, lastRow, pan.x, pan.y, zoom, w, h, dpr, BRANCH_COLORS, selectedCommit?.hash || null, hoveredRef.current);
  }, [commits, selectedCommit]);

  // ── Canvas 2D Fallback ──

  const renderCanvas2D = useCallback(() => {
    const canvas = canvas2dRef.current;
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

    const firstRow = Math.max(0, Math.floor(-pan.y / zoom / ROW_HEIGHT) - OVERSHOT_ROWS);
    const lastRow = Math.min(commits.length, Math.ceil((h - pan.y / zoom) / ROW_HEIGHT) + OVERSHOT_ROWS);
    const maxLane = Math.max(1, ...commits.map((c) => c.lane + 1));

    const root = getComputedStyle(document.documentElement);
    const bgColor = root.getPropertyValue("--gb-bg").trim() || "#1A1D23";
    const lineColor = root.getPropertyValue("--gb-border").trim() || "#2D313A";

    ctx.fillStyle = bgColor;
    ctx.fillRect(-pan.x / zoom, -pan.y / zoom, w / zoom, h / zoom);

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
      ctx.beginPath();
      ctx.arc(cx, cy, r + (isSel ? 3 : 0), 0, Math.PI * 2);
      if (isSel) {
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
    ctx.restore();
  }, [commits, selectedCommit]);

  // ── Interaction ──

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

    const visibleBottom = (-panRef.current.y + dimensionsRef.current.h) / zoomRef.current;
    const contentBottom = commits.length * ROW_HEIGHT;
    if (visibleBottom > contentBottom - 200) loadMore();
  }, [commits.length, loadMore]);

  const screenToCommit = useCallback((clientX: number, clientY: number): CommitNode | null => {
    const el = glCanvasRef.current || canvas2dRef.current;
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

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const c = screenToCommit(e.clientX, e.clientY);
    hoveredRef.current = c?.hash || null;
  }, [screenToCommit]);

  return (
    <div className="relative h-full w-full">
      {useWebgl ? (
        <canvas ref={glCanvasRef} className="absolute inset-0" style={{ zIndex: 1 }} />
      ) : (
        <canvas ref={canvas2dRef} className="absolute inset-0" style={{ zIndex: 1 }} />
      )}
      <div
        className="absolute inset-0"
        style={{ zIndex: 3, cursor: "crosshair" }}
        onWheel={handleWheel}
        onClick={handleClick}
        onMouseMove={handleMouseMove}
      />
    </div>
  );
}
