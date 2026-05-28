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

    const root = getComputedStyle(document.documentElement);
    const bgColor = root.getPropertyValue("--gb-bg").trim() || "#0b0d0f";

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, w, h);

    if (commits.length === 0) {
      rafRef.current = requestAnimationFrame(draw);
      return;
    }

    const firstRow = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - OVERSHOT_ROWS);
    const lastRow = Math.min(commits.length, Math.ceil((scrollTop + h) / ROW_HEIGHT) + OVERSHOT_ROWS);
    const offsetY = -scrollTop;

    const z = zoomLevel;
    const effLaneW = LANE_WIDTH * z;
    const effPad = PADDING_X * z;
    const effRadius = NODE_RADIUS * Math.max(0.5, z);
    const effLineW = 1.5 * z;

    try {
      for (let i = firstRow; i < lastRow; i++) {
        const c = commits[i];
        if (!c) continue;

        const cx = c.lane * effLaneW + effLaneW / 2 + effPad;
        const cy = offsetY + i * ROW_HEIGHT + ROW_HEIGHT / 2;

        for (const ph of c.parents) {
          const pi = commits.findIndex((p) => p.hash === ph);
          if (pi === -1) continue;
          const pp = commits[pi];
          const px = pp.lane * effLaneW + effLaneW / 2 + effPad;
          const py = offsetY + pi * ROW_HEIGHT + ROW_HEIGHT / 2;

          ctx.strokeStyle = BRANCH_COLORS[c.lane % BRANCH_COLORS.length];
          ctx.lineWidth = effLineW;
          ctx.beginPath();
          if (c.lane === pp.lane) {
            ctx.moveTo(cx, cy + effRadius);
            ctx.lineTo(px, py - effRadius);
          } else {
            const midY = (cy + py) / 2;
            ctx.moveTo(cx, cy + effRadius);
            ctx.lineTo(cx, midY);
            ctx.lineTo(px, midY);
            ctx.lineTo(px, py - effRadius);
          }
          ctx.stroke();
        }

        const isSel = selectedCommit?.hash === c.hash;
        const r = effRadius + (isSel ? 3 : 0);

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
  }, [commits, selectedCommit, scrollTop, zoomLevel]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [draw]);

  return (
    <div
      className="shrink-0"
      style={{ width: colWidth, height: "100%" }}
    >
      <canvas ref={canvasRef} className="block size-full" />
    </div>
  );
}

export default memo(GraphColumn);
