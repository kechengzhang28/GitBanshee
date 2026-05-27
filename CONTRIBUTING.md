# Contributing to GitBanshee

## Prerequisites

- Node.js 22+
- Rust 1.95+ (via [rustup](https://rustup.rs))
- **Windows only:** [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) with C++ workload

## Setup

```bash
npm install && npm --prefix ui install
```

## Development

```bash
npm run dev        # Cross-platform: Tauri window + Vite HMR
npm run dev:ui     # Frontend only (Vite dev server)
```

On Windows, `npm run dev` automatically detects and loads the MSVC toolchain. No manual environment setup required.

## Checks

```bash
npm run check      # TypeScript type-check + Rust cargo check + clippy
npm run check:ts   # Frontend only
npm run check:rs   # Rust only
```

## Build

```bash
npm run build           # Frontend production build
npm run tauri:build     # Full Tauri installable bundle
```

## Project Structure

```
GitBanshee/
├── ui/                  # React frontend (Vite + TypeScript)
│   ├── src/
│   │   ├── components/
│   │   ├── stores/      # Zustand state management
│   │   ├── types/       # TypeScript interfaces
│   │   ├── utils/       # IPC wrappers, theme loader
│   │   ├── i18n/        # Internationalization
│   │   └── themes/      # CSS variable theme files
│   ├── tailwind.config.ts
│   └── vite.config.ts
├── engine/               # Tauri Rust backend
│   ├── src/
│   │   ├── commands/    # IPC command handlers
│   │   ├── git/         # Git engine (libgit2 + CLI fallback)
│   │   └── models/      # Shared data models
│   ├── capabilities/    # Tauri v2 permission declarations
│   └── tauri.conf.json
├── scripts/              # Dev tooling (cross-platform)
├── docs/                 # Architecture documentation
└── .github/workflows/    # CI (check.yml + build.yml)
```

## Documentation

Architecture and design docs are in [`docs/`](docs/). Start with [`docs/architecture.md`](docs/architecture.md).
