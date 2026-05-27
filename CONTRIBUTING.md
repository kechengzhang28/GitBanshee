# Contributing to GitBanshee

## Prerequisites

- Node.js 22+
- Rust 1.95+ (via [rustup](https://rustup.rs))
- **Windows only:** [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) with C++ workload

## Setup

```bash
npm install
```

## Development

```bash
npm run dev         # Tauri window + Vite HMR (cross-platform)
npm run dev:ui      # Frontend only (Vite dev server)
```

## Build

```bash
npm run build       # Full installable bundle (.msi/.dmg/.deb)
npm run build:ui    # Frontend production build only
```

## Checks

```bash
npm run check       # TypeScript type-check + Rust cargo check + clippy
npm run check:ts    # Frontend only
npm run check:rs    # Rust only
```

## Project Structure

```
GitBanshee/
├── src/                   # React frontend
│   ├── components/
│   ├── renderer/          # WebGL + Canvas 2D hybrid graph renderer
│   ├── stores/            # Zustand state management
│   ├── types/             # TypeScript interfaces
│   ├── utils/             # IPC wrappers, theme loader
│   ├── i18n/              # Internationalization
│   └── themes/            # CSS variable theme files
├── src-tauri/             # Tauri Rust backend
│   ├── src/
│   │   ├── commands/      # IPC command handlers
│   │   ├── git/           # Git engine (libgit2 + CLI fallback)
│   │   └── models/        # Shared data models
│   ├── capabilities/      # Tauri v2 permission declarations
│   └── tauri.conf.json
├── scripts/               # Dev tooling (cross-platform)
├── docs/                  # Architecture documentation
└── .github/workflows/     # CI (check.yml + build.yml)
```

## Documentation

Architecture and design docs are in [`docs/`](docs/). Start with [`docs/architecture.md`](docs/architecture.md).

## Workflow

1. Pick a task from the [roadmap](docs/roadmap.md)
2. Create a feature branch
3. Run `npm run check` before committing
4. Open a PR — CI runs [check.yml](.github/workflows/check.yml) automatically
