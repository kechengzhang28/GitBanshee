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
  const laneSpans = useRepoStore((s) => s.laneSpans);
  const connections = useRepoStore((s) => s.connections);
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
      // ── Layer 1: vertical spans ──
      ctx.lineWidth = lineW;
      for (const span of laneSpans) {
        const vs = Math.max(span.start_row, firstRow);
        const ve = Math.min(span.end_row, lastRow);
        if (vs >= ve) continue;
        ctx.strokeStyle = color(span.lane);
        ctx.beginPath();
        ctx.moveTo(laneX(span.lane), rowY(vs));
        ctx.lineTo(laneX(span.lane), rowY(ve));
        ctx.stroke();
      }

      // ── Layer 2: cross-lane connections (horizontal + arc) ──
      ctx.lineWidth = lineW;
      for (const conn of connections) {
        if (conn.row < firstRow || conn.row >= lastRow) continue;

        const cornerX = laneX(conn.corner_lane);
        const hx = laneX(conn.horizontal_lane);
        const ry = rowY(conn.row);
        const cr = Math.min(r, (cornerX - hx) / 2);

        ctx.strokeStyle = color(conn.corner_lane);
        ctx.beginPath();

        if (conn.horizontal_first) {
          ctx.moveTo(hx, ry);
          ctx.lineTo(cornerX - cr, ry);
          ctx.arcTo(cornerX, ry, cornerX, ry + cr, cr);
        } else {
          ctx.moveTo(cornerX, ry - cr);
          ctx.arcTo(cornerX, ry, cornerX - cr, ry, cr);
          ctx.lineTo(hx, ry);
        }

        ctx.stroke();
      }

      // ── Layer 3: nodes ──
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
  }, [commits, laneSpans, connections, selectedCommit, scrollTop, zoomLevel]);

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
