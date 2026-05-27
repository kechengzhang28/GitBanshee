export const VERTEX = `
attribute vec2 a_position;
uniform float u_pointSize;
uniform vec2 u_translate;
uniform float u_scale;
uniform vec2 u_resolution;

void main() {
  vec2 pos = (a_position + u_translate) * u_scale;
  vec2 clip = (pos / u_resolution) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
  gl_PointSize = u_pointSize * u_scale;
}
`;

export const FRAGMENT_COLOR = `
precision mediump float;
uniform vec4 u_color;

void main() {
  gl_FragColor = u_color;
}
`;

export const FRAGMENT_CIRCLE = `
precision mediump float;
uniform vec4 u_color;
uniform float u_radius;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center) * 2.0;
  if (dist > u_radius) discard;
  gl_FragColor = u_color;
}
`;

export const FRAGMENT_GLOW = `
precision mediump float;
uniform vec4 u_color;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center) * 2.0;
  float alpha = smoothstep(1.0, 0.0, dist) * 0.3;
  gl_FragColor = vec4(u_color.rgb, alpha);
}
`;
