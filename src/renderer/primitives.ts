import type { GlContext } from "./webgl";
import { createBuffer } from "./webgl";
import type { CommitNode } from "../types";

const LANE_WIDTH = 24;
const ROW_HEIGHT = 32;
const NODE_RADIUS = 5;
const PADDING_X = 40;

export function drawBackground(
  g: GlContext,
  translateX: number,
  translateY: number,
  scale: number,
  width: number,
  height: number,
  firstRow: number,
  lastRow: number,
  maxLane: number,
  lineColor: [number, number, number, number],
) {
  const { gl, programs, locations } = g;

  const positions: number[] = [];
  for (let l = 0; l < maxLane; l++) {
    const x = l * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X;
    positions.push(x, firstRow * ROW_HEIGHT, x, lastRow * ROW_HEIGHT);
  }

  const buf = createBuffer(gl, new Float32Array(positions));
  gl.useProgram(programs.color);

  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(locations.colorPos);
  gl.vertexAttribPointer(locations.colorPos, 2, gl.FLOAT, false, 0, 0);

  gl.uniform2f(locations.colorTranslate, translateX, translateY);
  gl.uniform1f(locations.colorScale, scale);
  gl.uniform2f(locations.colorRes, width, height);
  gl.uniform4fv(locations.colorFill, lineColor);

  gl.lineWidth(1);
  gl.drawArrays(gl.LINES, 0, positions.length / 2);

  gl.deleteBuffer(buf);
}

export function drawConnectingLines(
  g: GlContext,
  commits: CommitNode[],
  firstRow: number,
  lastRow: number,
  translateX: number,
  translateY: number,
  scale: number,
  width: number,
  height: number,
  branchColors: string[],
) {
  const { gl, programs, locations } = g;
  const positions: number[] = [];
  const colors: number[] = [];

  for (let i = firstRow; i < lastRow; i++) {
    const c = commits[i];
    if (!c) continue;

    const sx = c.lane * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X;
    const sy = i * ROW_HEIGHT + ROW_HEIGHT / 2;

    for (const parentHash of c.parents) {
      const pi = commits.findIndex((p) => p.hash === parentHash);
      if (pi === -1) continue;
      const pp = commits[pi];
      const tx = pp.lane * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X;
      const ty = pi * ROW_HEIGHT + ROW_HEIGHT / 2;

      const color = hexToRgba(branchColors[c.lane % branchColors.length]);
      if (sx === tx) {
        positions.push(sx, sy + NODE_RADIUS, tx, ty - NODE_RADIUS);
        colors.push(...color, ...color);
      } else {
        const midY = (sy + ty) / 2;
        positions.push(sx, sy + NODE_RADIUS, sx, midY, tx, midY, tx, ty - NODE_RADIUS);
        colors.push(...color, ...color, ...color, ...color);
      }
    }
  }

  if (positions.length === 0) return;

  const posBuf = createBuffer(gl, new Float32Array(positions));
  gl.useProgram(programs.color);

  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.enableVertexAttribArray(locations.colorPos);
  gl.vertexAttribPointer(locations.colorPos, 2, gl.FLOAT, false, 0, 0);

  // Per-segment coloring: since we can't easily do per-vertex colors without
  // a separate attribute, we draw segments individually.
  gl.uniform2f(locations.colorTranslate, translateX, translateY);
  gl.uniform1f(locations.colorScale, scale);
  gl.uniform2f(locations.colorRes, width, height);
  gl.lineWidth(1.5);

  let offset = 0;
  for (let i = firstRow; i < lastRow; i++) {
    const c = commits[i];
    if (!c) continue;
    for (const _ of c.parents) {
      const pi = commits.findIndex((p) => p.hash === _);
      if (pi === -1) continue;
      const col = hexToRgba(branchColors[c.lane % branchColors.length]);
      gl.uniform4fv(locations.colorFill, col);
      const vertCount = 2; // always 2 vertices per segment for now
      gl.drawArrays(gl.LINE_STRIP, offset / 2, vertCount);
      offset += vertCount * 2;
    }
  }

  gl.deleteBuffer(posBuf);
}

export function drawNodes(
  g: GlContext,
  commits: CommitNode[],
  firstRow: number,
  lastRow: number,
  translateX: number,
  translateY: number,
  scale: number,
  width: number,
  height: number,
  branchColors: string[],
  selectedHash: string | null,
  hoveredHash: string | null,
) {
  const { gl, programs, locations } = g;

  // Draw regular nodes
  const positions: number[] = [];
  for (let i = firstRow; i < lastRow; i++) {
    const c = commits[i];
    if (!c) continue;
    if (c.hash === selectedHash || c.hash === hoveredHash) continue;
    positions.push(
      c.lane * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X,
      i * ROW_HEIGHT + ROW_HEIGHT / 2,
    );
  }

  if (positions.length > 0) {
    drawPointSprites(
      g,
      positions,
      translateX,
      translateY,
      scale,
      width,
      height,
      1.0,
      (x, y) => {
        const c = commitAt(commits, x, y);
        return hexToRgba(branchColors[(c?.lane || 0) % branchColors.length]);
      },
    );
  }

  // Draw hovered/selected nodes
  for (const hash of [hoveredHash, selectedHash]) {
    if (!hash) continue;
    const c = commits.find((c) => c.hash === hash);
    if (!c) continue;
    const r = hash === selectedHash ? 2.0 : 1.2;

    if (hash === selectedHash) {
      // Glow
      const glowPos = [c.lane * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X, c.row * ROW_HEIGHT + ROW_HEIGHT / 2];
      gl.useProgram(programs.glow);
      const gpBuf = createBuffer(gl, new Float32Array(glowPos));
      gl.bindBuffer(gl.ARRAY_BUFFER, gpBuf);
      gl.enableVertexAttribArray(locations.glowPos);
      gl.vertexAttribPointer(locations.glowPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(locations.glowTranslate, translateX, translateY);
      gl.uniform1f(locations.glowScale, scale);
      gl.uniform2f(locations.glowRes, width, height);
      const col = hexToRgba(branchColors[c.lane % branchColors.length]);
      gl.uniform4fv(locations.glowFill, col);
      gl.drawArrays(gl.POINTS, 0, 1);
      gl.deleteBuffer(gpBuf);
    }

    drawPointSprites(
      g,
      [c.lane * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X, c.row * ROW_HEIGHT + ROW_HEIGHT / 2],
      translateX, translateY, scale, width, height, r,
      () => hexToRgba(branchColors[c.lane % branchColors.length]),
    );
  }
}

function drawPointSprites(
  g: GlContext,
  positions: number[],
  tx: number, ty: number, scale: number, w: number, h: number,
  radiusScale: number,
  getColor: (x: number, y: number) => number[],
) {
  const { gl, programs, locations } = g;
  const buf = createBuffer(gl, new Float32Array(positions));
  gl.useProgram(programs.circle);

  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.enableVertexAttribArray(locations.circlePos);
  gl.vertexAttribPointer(locations.circlePos, 2, gl.FLOAT, false, 0, 0);

  gl.uniform2f(locations.circleTranslate, tx, ty);
  gl.uniform1f(locations.circleScale, scale);
  gl.uniform2f(locations.circleRes, w, h);
  gl.uniform1f(locations.circleRadius, NODE_RADIUS * radiusScale);

  // For simplicity, use first point's color for all
  const col = positions.length >= 2 ? getColor(positions[0], positions[1]) : [0.5, 0.5, 0.5, 1];
  gl.uniform4fv(locations.circleFill, col);

  gl.drawArrays(gl.POINTS, 0, positions.length / 2);
  gl.deleteBuffer(buf);
}

function commitAt(
  commits: CommitNode[],
  x: number,
  y: number,
): CommitNode | undefined {
  return commits.find(
    (c) =>
      c.lane * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X === x &&
      c.row * ROW_HEIGHT + ROW_HEIGHT / 2 === y,
  );
}

function hexToRgba(hex: string): [number, number, number, number] {
  const v = parseInt(hex.replace("#", ""), 16);
  return [((v >> 16) & 255) / 255, ((v >> 8) & 255) / 255, (v & 255) / 255, 1];
}
