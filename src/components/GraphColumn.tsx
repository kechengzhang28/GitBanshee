import { useEffect, useRef, useCallback, memo } from "react";
import { useRepoStore } from "../stores/repoStore";
import { ROW_HEIGHT, LANE_WIDTH, NODE_RADIUS, PADDING_X, OVERSHOT_ROWS, BRANCH_COLORS } from "./constants";

interface GraphColumnProps {
  scrollTop: number;
  colWidth: number;
  zoomLevel?: number;
}

function GraphColumn({ scrollTop, colWidth, zoomLevel = 1 }: GraphColumnProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  const commits = useRepoStore((s) => s.commits);
  const graphData = useRepoStore((s) => s.graphData);
  const selectedCommit = useRepoStore((s) => s.selectedCommit);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) { rafRef.current = requestAnimationFrame(draw); return; }

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const root = getComputedStyle(document.documentElement);
    const bg = root.getPropertyValue("--gb-bg").trim() || "#0b0d0f";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    if (commits.length === 0) { rafRef.current = requestAnimationFrame(draw); return; }

    const firstRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSHOT_ROWS);
    const lastRow = Math.min(commits.length, Math.ceil((scrollTop + h) / ROW_HEIGHT) + OVERSHOT_ROWS);
    const z = zoomLevel;
    const lw = LANE_WIDTH * z;
    const pad = PADDING_X * z;
    const r = NODE_RADIUS * Math.max(0.5, z);
    const lineW = 1.5 * z;

    const laneX = (lane: number) => lane * lw + lw / 2 + pad;
    const rowY = (row: number) => -scrollTop + row * ROW_HEIGHT + ROW_HEIGHT / 2;
    const color = (lane: number) => BRANCH_COLORS[lane % BRANCH_COLORS.length];

    try {
      // Layer 1: Paths (branch connecting lines)
      if (graphData) {
        ctx.lineWidth = lineW;
        for (const path of graphData.paths) {
          if (path.points.length < 2) continue;

          // Check if path overlaps visible range
          const pathStart = path.points[0].row;
          const pathEnd = path.points[path.points.length - 1].row;
          if (pathEnd < firstRow || pathStart > lastRow) continue;

          ctx.strokeStyle = path.color;
          ctx.beginPath();
          let started = false;

          for (let i = 0; i < path.points.length; i++) {
            const p = path.points[i];

            if (i === 0) {
              const x0 = laneX(p.lane);
              const y0 = rowY(p.row);
              ctx.moveTo(x0, y0);
              started = true;
              continue;
            }

            const prev = path.points[i - 1];
            const x0 = laneX(prev.lane);
            const y0 = rowY(prev.row);
            const x1 = laneX(p.lane);
            const y1 = rowY(p.row);

            if (prev.lane === p.lane) {
              ctx.lineTo(x1, y1);
            } else {
              const midY = (y0 + y1) / 2;
              ctx.bezierCurveTo(x0, midY, x1, midY, x1, y1);
            }
          }

          if (started) {
            ctx.stroke();
          }
        }

        // Layer 2: Links (merge arcs)
        for (const link of graphData.links) {
          const linkStartRow = link.start.row;
          const linkEndRow = link.end.row;
          if (linkStartRow < firstRow && linkEndRow < firstRow) continue;
          if (linkStartRow > lastRow && linkEndRow > lastRow) continue;

          ctx.strokeStyle = link.color;
          ctx.beginPath();
          const sx = laneX(link.start.lane);
          const sy = rowY(link.start.row);
          const cx = laneX(link.control.lane);
          const cy = rowY(link.control.row);
          const ex = laneX(link.end.lane);
          const ey = rowY(link.end.row);
          ctx.moveTo(sx, sy);
          ctx.quadraticCurveTo(cx, cy, ex, ey);
          ctx.stroke();
        }
      }

      // Layer 3: Nodes
      for (let i = firstRow; i < lastRow; i++) {
        const c = commits[i];
        if (!c) continue;
        const cx = laneX(c.lane);
        const cy = rowY(i);
        const isSel = selectedCommit?.hash === c.hash;
        const cr = r + (isSel ? 3 : 0);

        if (isSel) {
          ctx.beginPath();
          ctx.arc(cx, cy, cr + 3, 0, Math.PI * 2);
          ctx.fillStyle = color(c.lane);
          ctx.globalAlpha = 0.3;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fillStyle = color(c.lane);
        ctx.fill();
      }
    } catch { /* skip frame */ }

    rafRef.current = requestAnimationFrame(draw);
  }, [commits, graphData, selectedCommit, scrollTop, zoomLevel]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <div className="shrink-0" style={{ width: colWidth, height: "100%" }}>
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}

export default memo(GraphColumn);
