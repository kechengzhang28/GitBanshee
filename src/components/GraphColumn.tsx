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
      // Collect edge vertical ranges per lane to avoid double-draw with spans
      const edgeRanges = new Map<number, [number, number][]>();

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
          const vl = Math.max(c.lane, pp.lane);

          // Track edge vertical range for span subtraction
          {
            let list = edgeRanges.get(vl);
            if (!list) { list = []; edgeRanges.set(vl, list); }
            list.push([i, pi]);
          }

          ctx.strokeStyle = color(vl);
          ctx.lineWidth = lineW;
          ctx.beginPath();

          if (c.lane === pp.lane) {
            ctx.moveTo(cx, cy);
            ctx.lineTo(px, py);
          } else if (px > cx) {
            const cr = Math.min(r, Math.abs(px - cx) / 2, Math.abs(py - cy) / 2);
            ctx.moveTo(cx, cy);
            ctx.lineTo(px - cr, cy);
            ctx.arcTo(px, cy, px, cy + cr, cr);
            ctx.lineTo(px, py);
          } else {
            const cr = Math.min(r, Math.abs(px - cx) / 2, Math.abs(py - cy) / 2);
            ctx.moveTo(cx, cy);
            ctx.lineTo(cx, py - cr);
            ctx.arcTo(cx, py, cx - cr, py, cr);
            ctx.lineTo(px, py);
          }

          ctx.stroke();
        }
      }

      // Merge edge ranges per lane
      const edgeCovered = new Map<number, [number, number][]>();
      for (const [lane, ranges] of edgeRanges) {
        ranges.sort((a, b) => a[0] - b[0]);
        const merged: [number, number][] = [];
        for (const [s, e] of ranges) {
          const last = merged[merged.length - 1];
          if (last && last[1] >= s) {
            last[1] = Math.max(last[1], e);
          } else {
            merged.push([s, e]);
          }
        }
        edgeCovered.set(lane, merged);
      }

      // Lane continuation spans: draw vertical gaps not already covered by edges
      for (const span of laneSpans) {
        const vs = Math.max(span.start_row, firstRow);
        const ve = Math.min(span.end_row, lastRow);
        if (vs >= ve) continue;

        const covering = edgeCovered.get(span.lane);
        if (!covering) {
          // No edge coverage — draw full span
          ctx.strokeStyle = color(span.lane);
          ctx.lineWidth = lineW;
          ctx.beginPath();
          ctx.moveTo(laneX(span.lane), rowY(vs));
          ctx.lineTo(laneX(span.lane), rowY(ve));
          ctx.stroke();
          continue;
        }

        // Subtract edge-covered ranges, draw remaining gaps
        let cur = vs;
        for (const [es, ee] of covering) {
          const ecs = Math.max(es, cur);
          const ece = Math.min(ee, ve);
          if (ecs > cur) {
            // Gap from cur to ecs
            ctx.strokeStyle = color(span.lane);
            ctx.lineWidth = lineW;
            ctx.beginPath();
            ctx.moveTo(laneX(span.lane), rowY(cur));
            ctx.lineTo(laneX(span.lane), rowY(ecs));
            ctx.stroke();
          }
          cur = Math.max(cur, ece);
        }
        if (cur < ve) {
          // Trailing gap
          ctx.strokeStyle = color(span.lane);
          ctx.lineWidth = lineW;
          ctx.beginPath();
          ctx.moveTo(laneX(span.lane), rowY(cur));
          ctx.lineTo(laneX(span.lane), rowY(ve));
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
