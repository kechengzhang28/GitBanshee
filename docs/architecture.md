# GitBanshee Architecture

GitBanshee is a Tauri v2 desktop application for Git repository visualization with native AI integration.

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Desktop Framework** | Tauri v2 | Small binary, Rust backend, robust security model |
| **Frontend Framework** | React + TypeScript | Largest ecosystem, mature Canvas rendering support |
| **Build Tool** | Vite | Default Tauri v2 integration |
| **State Management** | Zustand | Lightweight, minimal boilerplate for IPC-driven data |
| **Styling** | Tailwind CSS | Utility-first rapid UI development |
| **Git Engine** | libgit2 bindings, CLI fallback | Native performance for core ops, CLI for complex operations |
| **Graph Rendering** | Canvas 2D + WebGL | WebGL for GPU-accelerated nodes/lines; Canvas 2D for high-quality text |
| **Graph Layout** | Custom lane-assignment algorithm | Computed on the Rust side, sent to frontend as coordinates |
| **AI Backend** | Ollama (local) + OpenAI (cloud) | Interchangeable dual-backend, no vendor lock-in |
| **Persistence** | Tauri plugin store | Encrypted storage for settings and API keys |

## Document Index

| Document | Description |
|----------|-------------|
| [git-engine.md](git-engine.md) | Git integration: dual-driver strategy, data models, caching |
| [graph-layout.md](graph-layout.md) | Commit graph layout: lane assignment algorithm, Canvas rendering strategy |
| [ai-integration.md](ai-integration.md) | AI integration: dual-backend routing, feature scenarios, security |
| [frontend-architecture.md](frontend-architecture.md) | Frontend design: component decomposition, state management, IPC patterns |
| [roadmap.md](roadmap.md) | Implementation plan: phases, milestones, acceptance criteria |
| [build-and-distribution.md](build-and-distribution.md) | Build pipeline: CI/CD, code signing, installer formats |
| [theme-system.md](theme-system.md) | Theme system: design tokens, auto-derivation, user customization |
| [development-workflow.md](development-workflow.md) | Dev workflow: hot reload, debugging, platform notes |

## Project Structure Overview

```
GitBanshee/
├── src/                       # React frontend
│   ├── components/            # UI components per feature domain
│   ├── renderer/              # WebGL + Canvas 2D hybrid graph renderer
│   │   ├── webgl.ts           # WebGL context, shader programs, VBO/VAO
│   │   ├── shaders.ts         # GLSL vertex/fragment shader sources
│   │   ├── primitives.ts      # High-level draw: nodes, lines, background
│   │   └── text.ts            # Canvas 2D text annotation helpers
│   ├── stores/                # Zustand state stores
│   ├── types/                 # Shared TypeScript type definitions
│   ├── utils/                 # IPC wrappers, theme loader
│   ├── i18n/                  # Internationalization
│   └── themes/                # CSS variable theme files
├── src-tauri/                 # Tauri Rust backend
│   ├── src/
│   │   ├── commands/          # IPC command handlers (invoke endpoints)
│   │   ├── git/               # Git engine (libgit2 + CLI fallback)
│   │   └── models/            # Shared data models (serialized across IPC)
│   ├── capabilities/          # Tauri v2 permission declarations
│   └── tauri.conf.json        # App configuration
├── scripts/                   # Cross-platform dev tooling
└── docs/                      # Architecture documentation
```

## Key Architecture Decisions

**Rust does the heavy lifting.** Git operations, graph layout, and AI routing run on the Rust side. The frontend receives pre-computed data and focuses on rendering.

**Two IPC patterns.** `invoke` for request/response (open repo, fetch commits), `emit`/`listen` for streaming (AI tokens, operation progress). See [frontend-architecture.md](frontend-architecture.md).

**libgit2 first, CLI fallback.** Core operations use native libgit2 bindings. Complex workflows (merge, rebase, fetch, push) fall back to the system `git` binary.

**AI backends are interchangeable.** Ollama (local) and OpenAI (cloud) share the same interface. Switching requires only a settings change.
