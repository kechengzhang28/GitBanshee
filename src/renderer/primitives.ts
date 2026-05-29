import type { GlContext } from "./webgl";
import { createBuffer } from "./webgl";
import type { PositionedCommit } from "../types";

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
  commits: PositionedCommit[],
  firstRow: number,
  lastRow: number,
  translateX: number,
  translateY: number,
  scale: number,
  width: number,
  height: number,
) {
  const { gl, programs, locations } = g;
  const positions: number[] = [];
  const colors: number[] = [];

  for (let i = firstRow; i < lastRow; i++) {
    const c = commits[i];
    if (!c) continue;

    const sx = c.col * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X;
    const sy = i * ROW_HEIGHT + ROW_HEIGHT / 2;

    for (const parentHash of c.parents) {
      const pi = commits.findIndex((p) => p.sha === parentHash);
      if (pi === -1) continue;
      const pp = commits[pi];
      const tx = pp.col * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X;
      const ty = pi * ROW_HEIGHT + ROW_HEIGHT / 2;

      const color = hexToRgba(c.color);
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

  gl.uniform2f(locations.colorTranslate, translateX, translateY);
  gl.uniform1f(locations.colorScale, scale);
  gl.uniform2f(locations.colorRes, width, height);
  gl.lineWidth(1.5);

  let offset = 0;
  for (let i = firstRow; i < lastRow; i++) {
    const c = commits[i];
    if (!c) continue;
    for (const _ of c.parents) {
      const pi = commits.findIndex((p) => p.sha === _);
      if (pi === -1) continue;
      const col = hexToRgba(c.color);
      gl.uniform4fv(locations.colorFill, col);
      const vertCount = 2;
      gl.drawArrays(gl.LINE_STRIP, offset / 2, vertCount);
      offset += vertCount * 2;
    }
  }

  gl.deleteBuffer(posBuf);
}

export function drawNodes(
  g: GlContext,
  commits: PositionedCommit[],
  firstRow: number,
  lastRow: number,
  translateX: number,
  translateY: number,
  scale: number,
  width: number,
  height: number,
  dpr: number,
  selectedSha: string | null,
  hoveredSha: string | null,
) {
  const { gl, programs, locations } = g;

  const positions: number[] = [];
  for (let i = firstRow; i < lastRow; i++) {
    const c = commits[i];
    if (!c) continue;
    if (c.sha === selectedSha || c.sha === hoveredSha) continue;
    positions.push(
      c.col * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X,
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
      dpr,
      (x, y) => {
        const c = commitAt(commits, x, y);
        return c ? hexToRgba(c.color) : [0.5, 0.5, 0.5, 1.0] as [number, number, number, number];
      },
    );
  }

  for (const sha of [hoveredSha, selectedSha]) {
    if (!sha) continue;
    const c = commits.find((c) => c.sha === sha);
    if (!c) continue;
    const r = sha === selectedSha ? 2.0 : 1.2;

    if (sha === selectedSha) {
      const glowPos = [c.col * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X, c.row * ROW_HEIGHT + ROW_HEIGHT / 2];
      gl.useProgram(programs.glow);
      const gpBuf = createBuffer(gl, new Float32Array(glowPos));
      gl.bindBuffer(gl.ARRAY_BUFFER, gpBuf);
      gl.enableVertexAttribArray(locations.glowPos);
      gl.vertexAttribPointer(locations.glowPos, 2, gl.FLOAT, false, 0, 0);
      gl.uniform2f(locations.glowTranslate, translateX, translateY);
      gl.uniform1f(locations.glowScale, scale);
      gl.uniform2f(locations.glowRes, width, height);
      gl.uniform1f(locations.glowPointSize, NODE_RADIUS * 6 * dpr);
      gl.uniform4fv(locations.glowFill, hexToRgba(c.color));
      gl.drawArrays(gl.POINTS, 0, 1);
      gl.deleteBuffer(gpBuf);
    }

    drawPointSprites(
      g,
      [c.col * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X, c.row * ROW_HEIGHT + ROW_HEIGHT / 2],
      translateX, translateY, scale, width, height, r, dpr,
      () => hexToRgba(c.color),
    );
  }
}

function drawPointSprites(
  g: GlContext,
  positions: number[],
  tx: number, ty: number, scale: number, w: number, h: number,
  radiusScale: number,
  dpr: number,
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
  gl.uniform1f(locations.circlePointSize, NODE_RADIUS * radiusScale * 2 * dpr);

  const col = positions.length >= 2 ? getColor(positions[0], positions[1]) : [0.5, 0.5, 0.5, 1];
  gl.uniform4fv(locations.circleFill, col);

  gl.drawArrays(gl.POINTS, 0, positions.length / 2);
  gl.deleteBuffer(buf);
}

function commitAt(
  commits: PositionedCommit[],
  x: number,
  y: number,
): PositionedCommit | undefined {
  return commits.find(
    (c) =>
      c.col * LANE_WIDTH + LANE_WIDTH / 2 + PADDING_X === x &&
      c.row * ROW_HEIGHT + ROW_HEIGHT / 2 === y,
  );
}

function hexToRgba(hex: string): [number, number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return [r, g, b, 1.0];
}
