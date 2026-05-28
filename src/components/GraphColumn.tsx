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
    const oy = -scrollTop;
    const z = zoomLevel;
    const lw = LANE_WIDTH * z;
    const pad = PADDING_X * z;
    const r = NODE_RADIUS * Math.max(0.5, z);
    const lineW = 1.5 * z;

    const laneX = (lane: number) => lane * lw + lw / 2 + pad;
    const rowY = (row: number) => oy + row * ROW_HEIGHT + ROW_HEIGHT / 2;
    const color = (lane: number) => BRANCH_COLORS[lane % BRANCH_COLORS.length];

    try {
      // Draw all parent-child edges
      for (let i = firstRow; i < lastRow; i++) {
        const c = commits[i];
        if (!c) continue;
        const cx = laneX(c.lane);
        const cy = rowY(i);

        for (const ph of c.parents) {
          const pi = commits.findIndex((p) => p.hash === ph);
          if (pi === -1) continue;
          const pp = commits[pi];
          const px = laneX(pp.lane);
          const py = rowY(pi);

          ctx.strokeStyle = color(c.lane);
          ctx.lineWidth = lineW;
          ctx.beginPath();

          if (c.lane === pp.lane) {
            ctx.moveTo(cx, cy);
            ctx.lineTo(px, py);
          } else if (px > cx) {
            ctx.moveTo(cx, cy);
            ctx.lineTo(px, cy);
            ctx.lineTo(px, py);
          } else {
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx, py);
            ctx.lineTo(px, py);
          }

          ctx.stroke();
        }
      }

      // Draw nodes
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
  }, [commits, selectedCommit, scrollTop, zoomLevel]);

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
