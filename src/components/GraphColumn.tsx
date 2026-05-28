import { useEffect, useRef, useCallback, useMemo, memo } from "react";
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

  const hashToRow = useMemo(() => {
    const m = new Map<string, number>();
    for (let i = 0; i < commits.length; i++) {
      m.set(commits[i].hash, i);
    }
    return m;
  }, [commits]);

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
      // Layer 1: per-parent-child-pair connecting lines
      // Iterate from 0 to capture children above the visible range
      // whose parent is within the visible range
      ctx.lineWidth = lineW;
      for (let i = 0; i < lastRow; i++) {
        const c = commits[i];
        if (!c) continue;
        const sx = laneX(c.lane);
        const sy = rowY(i) + r;

        for (const parentHash of c.parents) {
          const parentRow = hashToRow.get(parentHash);
          let tx: number;
          let ty: number;
          let pr: number;

          if (parentRow !== undefined) {
            if (i >= parentRow) continue;
            pr = parentRow;
            if (pr < firstRow) continue;
            const pp = commits[parentRow];
            if (!pp) continue;
            tx = laneX(pp.lane);
            ty = rowY(parentRow) - r;
          } else {
            pr = lastRow;
            tx = laneX(c.lane);
            ty = rowY(lastRow) + ROW_HEIGHT;
          }

          ctx.strokeStyle = color(c.lane);
          ctx.beginPath();
          if (tx === sx) {
            ctx.moveTo(sx, sy);
            ctx.lineTo(tx, ty);
          } else {
            const midY = (sy + ty) / 2;
            ctx.moveTo(sx, sy);
            ctx.lineTo(sx, midY);
            ctx.lineTo(tx, midY);
            ctx.lineTo(tx, ty);
          }
          ctx.stroke();
        }
      }

      // Layer 2: nodes
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
  }, [commits, hashToRow, selectedCommit, scrollTop, zoomLevel]);

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
