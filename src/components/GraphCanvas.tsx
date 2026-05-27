import { useEffect, useRef, useCallback } from "react";
import { useRepoStore } from "../stores/repoStore";
import type { CommitNode } from "../types";
import { initGl } from "../renderer/webgl";
import type { GlContext } from "../renderer/webgl";
import { drawBackground, drawConnectingLines, drawNodes } from "../renderer/primitives";
import { drawLabels } from "../renderer/text";

const ROW_HEIGHT = 32;
const LANE_WIDTH = 24;
const NODE_RADIUS = 5;
const PADDING_X = 40;
const OVERSHOT_ROWS = 20;
const COMMIT_LIMIT = 500;

const BRANCH_COLORS = [
  "#89b4fa", "#a6e3a1", "#f9e2af", "#f38ba8", "#cba6f7", "#94e2d5",
];

export default function GraphCanvas() {
  const glCanvasRef = useRef<HTMLCanvasElement>(null);
  const textCanvasRef = useRef<HTMLCanvasElement>(null);
  const glRef = useRef<GlContext | null>(null);
  const dimensionsRef = useRef({ w: 800, h: 600 });

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

  const maxLane = Math.max(1, ...commits.map((c) => c.lane + 1));

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

  // Init WebGL
  useEffect(() => {
    const canvas = glCanvasRef.current;
    if (!canvas) return;
    glRef.current = initGl(canvas);
  }, []);

  // Resize
  useEffect(() => {
    const el = glCanvasRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      dimensionsRef.current = { w: width, h: height };
      el.width = width * devicePixelRatio;
      el.height = height * devicePixelRatio;
      const tc = textCanvasRef.current;
      if (tc) {
        tc.width = width * devicePixelRatio;
        tc.height = height * devicePixelRatio;
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Render loop
  useEffect(() => {
    let animId: number;
    let running = true;

    const render = () => {
      if (!running) return;
      renderFrame();
      animId = requestAnimationFrame(render);
    };
    render();
    return () => {
      running = false;
      cancelAnimationFrame(animId);
    };
  }, [commits, selectedCommit]);

  const renderFrame = useCallback(() => {
    const g = glRef.current;
    const glCanvas = glCanvasRef.current;
    const textCanvas = textCanvasRef.current;
    if (!g || !glCanvas) return;

    const { gl } = g;
    const dpr = devicePixelRatio;
    const { w, h } = dimensionsRef.current;
    const zoom = zoomRef.current;
    const pan = panRef.current;

    gl.viewport(0, 0, w * dpr, h * dpr);
    gl.clearColor(0.1, 0.11, 0.14, 1);
    gl.clear(gl.COLOR_BUFFER_BIT);

    const rowHeight = ROW_HEIGHT;
    const firstRow = Math.max(0, Math.floor(-pan.y / zoom / rowHeight) - OVERSHOT_ROWS);
    const lastRow = Math.min(
      commits.length,
      Math.ceil((h - pan.y / zoom) / rowHeight) + OVERSHOT_ROWS,
    );

    const lineColor: [number, number, number, number] = [0.18, 0.2, 0.24, 1];

    // Transforms: canvas coords → WebGL clip space
    const glX = pan.x;
    const glY = pan.y;

    drawBackground(g, glX, glY, zoom, w, h, firstRow, lastRow, maxLane, lineColor);
    drawConnectingLines(g, commits, firstRow, lastRow, glX, glY, zoom, w, h, BRANCH_COLORS);
    drawNodes(g, commits, firstRow, lastRow, glX, glY, zoom, w, h, BRANCH_COLORS, selectedCommit?.hash || null, hoveredRef.current);

    // Canvas 2D text
    const ctx = textCanvas?.getContext("2d");
    if (ctx && textCanvas) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const textColor = getComputedStyle(document.documentElement).getPropertyValue("--gb-text-sec").trim() || "#888";
      drawLabels(ctx, commits, firstRow, lastRow, glX, glY, zoom, textColor);
    }
  }, [commits, selectedCommit, maxLane]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
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

      // Lazy load
      const visibleBottom = (-panRef.current.y + dimensionsRef.current.h) / zoomRef.current;
      const contentBottom = commits.length * ROW_HEIGHT;
      if (visibleBottom > contentBottom - 200) loadMore();
    },
    [commits.length, loadMore],
  );

  const screenToCommit = useCallback(
    (clientX: number, clientY: number): CommitNode | null => {
      const el = glCanvasRef.current;
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      const x = (clientX - rect.left - panRef.current.x) / zoomRef.current;
      const y = (clientY - rect.top - panRef.current.y) / zoomRef.current;

      for (const c of commits) {
        const cx = c.lane * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X;
        const cy = c.row * ROW_HEIGHT + ROW_HEIGHT / 2;
        const dx = x - cx;
        const dy = y - cy;
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
        ref={glCanvasRef}
        className="absolute inset-0"
        style={{ zIndex: 1 }}
      />
      <canvas
        ref={textCanvasRef}
        className="absolute inset-0"
        style={{ zIndex: 2, pointerEvents: "none" }}
      />
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
