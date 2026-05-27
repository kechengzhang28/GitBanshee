import { VERTEX, FRAGMENT_COLOR, FRAGMENT_CIRCLE, FRAGMENT_GLOW } from "./shaders";

export interface GlContext {
  gl: WebGLRenderingContext;
  programs: {
    color: WebGLProgram;
    circle: WebGLProgram;
    glow: WebGLProgram;
  };
  locations: {
    colorPos: number;
    colorTranslate: WebGLUniformLocation | null;
    colorScale: WebGLUniformLocation | null;
    colorRes: WebGLUniformLocation | null;
    colorFill: WebGLUniformLocation | null;

    circlePos: number;
    circleTranslate: WebGLUniformLocation | null;
    circleScale: WebGLUniformLocation | null;
    circleRes: WebGLUniformLocation | null;
    circleFill: WebGLUniformLocation | null;
    circleRadius: WebGLUniformLocation | null;

    glowPos: number;
    glowTranslate: WebGLUniformLocation | null;
    glowScale: WebGLUniformLocation | null;
    glowRes: WebGLUniformLocation | null;
    glowFill: WebGLUniformLocation | null;
  };
}

function compileShader(
  gl: WebGLRenderingContext,
  type: number,
  source: string,
): WebGLShader {
  const shader = gl.createShader(type)!;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const info = gl.getShaderInfoLog(shader);
    gl.deleteShader(shader);
    throw new Error("Shader compile failed: " + info);
  }
  return shader;
}

function makeProgram(
  gl: WebGLRenderingContext,
  vertSrc: string,
  fragSrc: string,
): WebGLProgram {
  const vert = compileShader(gl, gl.VERTEX_SHADER, vertSrc);
  const frag = compileShader(gl, gl.FRAGMENT_SHADER, fragSrc);
  const prog = gl.createProgram()!;
  gl.attachShader(prog, vert);
  gl.attachShader(prog, frag);
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    const info = gl.getProgramInfoLog(prog);
    throw new Error("Program link failed: " + info);
  }
  return prog;
}

export function initGl(canvas: HTMLCanvasElement): GlContext {
  const gl = canvas.getContext("webgl", { antialias: true, alpha: false })!;
  if (!gl) throw new Error("WebGL not supported");

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const colorProg = makeProgram(gl, VERTEX, FRAGMENT_COLOR);
  const circleProg = makeProgram(gl, VERTEX, FRAGMENT_CIRCLE);
  const glowProg = makeProgram(gl, VERTEX, FRAGMENT_GLOW);

  const getAttr = (p: WebGLProgram, name: string) => gl.getAttribLocation(p, name);
  const getUni = (p: WebGLProgram, name: string) => gl.getUniformLocation(p, name);

  return {
    gl,
    programs: { color: colorProg, circle: circleProg, glow: glowProg },
    locations: {
      colorPos: getAttr(colorProg, "a_position"),
      colorTranslate: getUni(colorProg, "u_translate"),
      colorScale: getUni(colorProg, "u_scale"),
      colorRes: getUni(colorProg, "u_resolution"),
      colorFill: getUni(colorProg, "u_color"),

      circlePos: getAttr(circleProg, "a_position"),
      circleTranslate: getUni(circleProg, "u_translate"),
      circleScale: getUni(circleProg, "u_scale"),
      circleRes: getUni(circleProg, "u_resolution"),
      circleFill: getUni(circleProg, "u_color"),
      circleRadius: getUni(circleProg, "u_radius"),

      glowPos: getAttr(glowProg, "a_position"),
      glowTranslate: getUni(glowProg, "u_translate"),
      glowScale: getUni(glowProg, "u_scale"),
      glowRes: getUni(glowProg, "u_resolution"),
      glowFill: getUni(glowProg, "u_color"),
    },
  };
}

export function createBuffer(gl: WebGLRenderingContext, data: Float32Array): WebGLBuffer {
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
  return buf;
}
