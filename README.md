# GitBanshee

A Git visualization desktop app with native AI integration, built with Tauri v2 + React + Rust.

## Quick Start

```bash
# Install dependencies
npm install
npm --prefix ui install

# Development (run in PowerShell with VC environment)
npm run tauri dev

# Frontend only
npm run dev
```

**Prerequisites:**
- Node.js 22+
- Rust 1.95+ (via [rustup](https://rustup.rs))
- [Visual Studio Build Tools](https://visualstudio.microsoft.com/downloads/#build-tools-for-visual-studio-2022) with C++ workload (Windows only)

## Documentation

All architecture and design docs live in [`docs/`](docs/):

| Document | Description |
|----------|-------------|
| [docs/architecture.md](docs/architecture.md) | Architecture overview, tech stack, project structure |
| [docs/git-engine.md](docs/git-engine.md) | Git engine design and data models |
| [docs/graph-layout.md](docs/graph-layout.md) | Commit graph layout and Canvas rendering |
| [docs/ai-integration.md](docs/ai-integration.md) | AI dual-backend integration |
| [docs/frontend-architecture.md](docs/frontend-architecture.md) | Frontend component tree and IPC patterns |
| [docs/roadmap.md](docs/roadmap.md) | 6-phase incremental implementation plan |
| [docs/build-and-distribution.md](docs/build-and-distribution.md) | CI/CD pipeline, code signing, installers |
| [docs/theme-system.md](docs/theme-system.md) | CSS variable theme system |
| [docs/development-workflow.md](docs/development-workflow.md) | Hot reload, debugging, platform notes |
