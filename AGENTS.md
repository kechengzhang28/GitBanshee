# AGENTS.md

## Two-package repo

`src/` is the React frontend. `src-tauri/` is the Rust backend. Each has its own check commands but they share `package.json`.

```bash
npm run dev          # Full app: MSVC env → tauri dev → Vite + Rust + Tauri window
npm run dev:ui       # Vite dev server only (port 1420), no Tauri window
npm run build        # Full installable bundle (.msi/.dmg/.deb)
npm run build:ui     # Frontend production build only
npm run check        # tsc --noEmit && cargo check && cargo clippy -- -D warnings
npm run check:ts     # Frontend type-check only
npm run check:rs     # Rust check + clippy only
```

## No linter, no tests

There is no ESLint, Prettier, vitest, or Rust test harness. The only verification is `npm run check`. CI enforces clippy warnings as errors (`cargo clippy -- -D warnings`).

## Windows: MSVC toolchain required

`scripts/dev.mjs` and `scripts/build.mjs` auto-detect VS Build Tools via `scripts/vcenv.mjs` and load `vcvars64.bat`. If not installed, the error tells you what to install. macOS/Linux run `tauri dev` directly without this step.

## Vite port 1420 is locked

`vite.config.ts` uses `strictPort: true`. `tauri.conf.json` expects `devUrl: "http://localhost:1420"`. Do not change the port without updating both files.

## Architecture: Rust does the heavy lifting

Git operations, graph layout, and AI routing run on the Rust side (`src-tauri/src/`). The frontend is a rendering layer that receives pre-computed data via Tauri IPC:
- `invoke` for request/response (open repo, fetch commits)
- `emit`/`listen` for streaming (AI tokens, progress)

Git engine: libgit2 for core ops, system `git` CLI as fallback for complex operations (merge, rebase, fetch, push).

## Roadmap-driven development

Before implementing anything, check `docs/roadmap.md` for the current phase and acceptance criteria. Work should map to a roadmap phase. AI commit message generation (v0.5) must follow Conventional Commits spec.

## Theme: CSS custom properties, not Tailwind `dark:`

Themes use `data-theme` on `<html>` with CSS custom properties in `src/themes/`. Persisted to localStorage. Do not use Tailwind `dark:` variants.

## i18n required for all user-facing strings

Even English-only UI must go through i18next. Locales in `src/i18n/`. The architecture requires it even if only one language is active.

## Knowledge graph available

`graphify-out/` contains a pre-built knowledge graph (282 nodes, 19 communities) generated from code AST + docs. `graphify-out/graph.html` opens an interactive graph. Run `/graphify query "<question>"` to traverse it.
