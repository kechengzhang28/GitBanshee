import type { PositionedCommit } from "../types";

const ROW_HEIGHT = 32;
const LANE_WIDTH = 24;
const NODE_RADIUS = 5;
const LABEL_PADDING = 6;
const PADDING_X = 40;

export function drawLabels(
  ctx: CanvasRenderingContext2D,
  commits: PositionedCommit[],
  firstRow: number,
  lastRow: number,
  translateX: number,
  translateY: number,
  scale: number,
  textColor: string,
) {
  ctx.save();
  ctx.translate(translateX, translateY);
  ctx.scale(scale, scale);
  ctx.font = `${11 / scale}px sans-serif`;
  ctx.fillStyle = textColor;

  for (let i = firstRow; i < lastRow; i++) {
    const c = commits[i];
    if (!c) continue;

    if (c.sha === commits[0]?.sha) {
      const x = c.col * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X + NODE_RADIUS + LABEL_PADDING;
      const y = i * ROW_HEIGHT + ROW_HEIGHT / 2 + 4;
      ctx.fillText("HEAD", x, y);
    }
  }

  ctx.restore();
}
