const STYLE_ID = "gb-theme-style";

const REQUIRED_VARS = ["--gb-bg", "--gb-accent", "--gb-text"] as const;

interface ThemeEntry {
  name: string;
  path: string;
  builtin: boolean;
}



function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, "0")).join("")}`;
}

function luminance(r: number, g: number, b: number): number {
  return 0.299 * r + 0.587 * g + 0.618 * b;
}

function blend(c1: string, c2: string, ratio: number): string {
  const [r1, g1, b1] = hexToRgb(c1);
  const [r2, g2, b2] = hexToRgb(c2);
  return rgbToHex(
    r1 + (r2 - r1) * ratio,
    g1 + (g2 - g1) * ratio,
    b1 + (b2 - b1) * ratio,
  );
}

function shiftLuminance(hex: string, delta: number): string {
  const [r, g, b] = hexToRgb(hex);
  const l = luminance(r, g, b);
  const factor = l < 128 ? 1 + delta : 1 - delta;
  return rgbToHex(r * factor, g * factor, b * factor);
}



function derive(
  bg: string,
  accent: string,
  text: string,
  overrides: Record<string, string>,
): Record<string, string> {
  const isDark = luminance(...hexToRgb(bg)) < 128;
  const panel = isDark ? shiftLuminance(bg, 0.08) : shiftLuminance(bg, -0.03);
  const toolbar = isDark
    ? shiftLuminance(bg, 0.04)
    : shiftLuminance(bg, -0.06);
  const input = isDark
    ? shiftLuminance(bg, 0.12)
    : shiftLuminance(bg, -0.04);
  const hover = blend(bg, text, 0.1);
  const border = blend(bg, text, 0.2);
  return {
    "--gb-bg": overrides["--gb-bg"] || bg,
    "--gb-accent": overrides["--gb-accent"] || accent,
    "--gb-text": overrides["--gb-text"] || text,
    "--gb-panel": overrides["--gb-panel"] || panel,
    "--gb-toolbar": overrides["--gb-toolbar"] || toolbar,
    "--gb-input": overrides["--gb-input"] || input,
    "--gb-hover": overrides["--gb-hover"] || hover,
    "--gb-border": overrides["--gb-border"] || border,
    "--gb-text-sec": overrides["--gb-text-sec"] || blend(text, bg, 0.4),
    "--gb-text-muted": overrides["--gb-text-muted"] || blend(text, bg, 0.6),
    "--gb-accent-h": overrides["--gb-accent-h"] || shiftLuminance(accent, 0.15),
    "--gb-success": overrides["--gb-success"] || "#3fb950",
    "--gb-danger": overrides["--gb-danger"] || "#f85149",
    "--gb-warning": overrides["--gb-warning"] || "#d29922",
    "--gb-branch-0": overrides["--gb-branch-0"] || "#58a6ff",
    "--gb-branch-1": overrides["--gb-branch-1"] || "#3fb950",
    "--gb-branch-2": overrides["--gb-branch-2"] || "#d29922",
    "--gb-branch-3": overrides["--gb-branch-3"] || "#a371f7",
    "--gb-branch-4": overrides["--gb-branch-4"] || "#f85149",
    "--gb-branch-5": overrides["--gb-branch-5"] || "#39d353",
  };
}

function buildStyleContent(vars: Record<string, string>): string {
  return `:root {\n${Object.entries(vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n")}\n}`;
}

export async function scanThemes(): Promise<ThemeEntry[]> {
  const themes: ThemeEntry[] = [];
  const builtinModules = import.meta.glob("../themes/*.css", {
    query: "?url",
    import: "default",
  });
  for (const [path, loader] of Object.entries(builtinModules)) {
    const name = path.split("/").pop()?.replace(".css", "") || "";
    if (name === "template") continue;
    const url = (await loader()) as string;
    themes.push({ name, path: url, builtin: true });
  }
  return themes;
}

export function loadTheme(cssContent: string): boolean {
  const rawVars = parseThemeVars(cssContent);
  for (const v of REQUIRED_VARS) {
    if (!rawVars[v]) {
      console.error(`Theme missing required variable: ${v}`);
      return false;
    }
  }

  const derived = derive(
    rawVars["--gb-bg"],
    rawVars["--gb-accent"],
    rawVars["--gb-text"],
    rawVars,
  );

  let style = document.getElementById(STYLE_ID);
  if (!style) {
    style = document.createElement("style");
    style.id = STYLE_ID;
    document.head.appendChild(style);
  }
  style.textContent = buildStyleContent(derived);
  return true;
}

function parseThemeVars(css: string): Record<string, string> {
  const vars: Record<string, string> = {};
  const re = /--gb-[\w-]+:\s*([^;]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(css)) !== null) {
    const full = m[0];
    const colonIndex = full.indexOf(":");
    const key = full.slice(0, colonIndex).trim();
    vars[key] = full.slice(colonIndex + 1).trim();
  }
  return vars;
}

export async function fetchThemeContent(url: string): Promise<string> {
  const res = await fetch(url);
  return res.text();
}

export function getThemeVariable(name: string): string {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}
