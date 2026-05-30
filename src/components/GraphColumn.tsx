import { useEffect, useRef, useCallback, memo } from "react";
import { useCommits, useRenderData, useSelectedCommit } from "../stores/repoStore";
import { ROW_HEIGHT, LANE_WIDTH, NODE_RADIUS, PADDING_X, OVERSHOT_ROWS } from "./constants";

interface GraphColumnProps {
  scrollTop: number;
  colWidth: number;
  zoomLevel?: number;
}

function GraphColumn({ scrollTop, colWidth, zoomLevel = 1 }: GraphColumnProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef(0);

  const commits = useCommits();
  const renderData = useRenderData();
  const selectedCommit = useSelectedCommit();

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
    const cr = 4 * z;

    const laneX = (col: number) => col * lw + lw / 2 + pad;
    const rowY = (row: number) => -scrollTop + row * ROW_HEIGHT + ROW_HEIGHT / 2;

    try {
      // Layer 1: Branch paths (vertical straight lines)
      if (renderData) {
        ctx.lineWidth = lineW;
        for (const bp of renderData.branch_paths) {
          if (bp.end_row < firstRow || bp.start_row > lastRow) continue;

          const x0 = laneX(bp.col);
          const y0 = rowY(Math.max(bp.start_row, firstRow));
          const y1 = rowY(Math.min(bp.end_row, lastRow));

          ctx.strokeStyle = bp.color;
          ctx.beginPath();
          ctx.moveTo(x0, y0);
          ctx.lineTo(x0, y1);
          ctx.stroke();
        }

        // Layer 2: Merge curves (from merge commit to merged parent)
        for (const mc of renderData.merge_curves) {
          if (mc.to_row < firstRow && mc.from_row < firstRow) continue;
          if (mc.to_row > lastRow && mc.from_row > lastRow) continue;

          const sx = laneX(mc.from_col);
          const sy = rowY(mc.from_row);
          const ex = laneX(mc.to_col);
          const ey = rowY(mc.to_row);

          ctx.strokeStyle = mc.color;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.arcTo(ex, sy, ex, ey, cr);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }

        // Layer 3: Fork curves (from parent to forking child)
        for (const fc of renderData.fork_curves) {
          if (fc.to_row < firstRow && fc.from_row < firstRow) continue;
          if (fc.to_row > lastRow && fc.from_row > lastRow) continue;

          const sx = laneX(fc.from_col);
          const sy = rowY(fc.from_row);
          const ex = laneX(fc.to_col);
          const ey = rowY(fc.to_row);

          ctx.strokeStyle = fc.color;
          ctx.beginPath();
          ctx.moveTo(sx, sy);
          ctx.arcTo(ex, sy, ex, ey, cr);
          ctx.lineTo(ex, ey);
          ctx.stroke();
        }
      }

      // Layer 4: Nodes
      for (let i = firstRow; i < lastRow; i++) {
        const c = commits[i];
        if (!c) continue;
        const cx = laneX(c.col);
        const cy = rowY(i);
        const isSel = selectedCommit?.sha === c.sha;
        const cr = r + (isSel ? 3 : 0);

        if (isSel) {
          ctx.beginPath();
          ctx.arc(cx, cy, cr + 3, 0, Math.PI * 2);
          ctx.fillStyle = c.color;
          ctx.globalAlpha = 0.3;
          ctx.fill();
          ctx.globalAlpha = 1;
        }

        ctx.beginPath();
        ctx.arc(cx, cy, cr, 0, Math.PI * 2);
        ctx.fillStyle = c.color;
        ctx.fill();
      }
    } catch { /* skip frame */ }

    rafRef.current = requestAnimationFrame(draw);
  }, [commits, renderData, selectedCommit, scrollTop, zoomLevel]);

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
