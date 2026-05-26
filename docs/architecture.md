# GitBanshee Architecture

GitBanshee is a Tauri v2-based Git visualization desktop application with native AI integration.

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Desktop Framework** | Tauri v2 | Small binary (~5MB), Rust backend, robust security model |
| **Frontend Framework** | React 18 + TypeScript | Largest ecosystem, ideal for Canvas rendering |
| **Build Tool** | Vite | Default Tauri v2 integration |
| **State Management** | Zustand | Lightweight, works well with Tauri IPC |
| **Styling** | Tailwind CSS | Rapid UI development |
| **Git Engine** | git2-rs + CLI fallback | Native libgit2 bindings, falling back to git CLI |
| **Graph Rendering** | Canvas 2D | Suitable for 10K+ commit nodes |
| **Graph Layout** | Rust custom Sugiyama algorithm | Coordinates computed on the Rust side |
| **AI Backend** | Ollama (local) + OpenAI (cloud) | Interchangeable dual-backend architecture |
| **Persistence** | tauri-plugin-store | Encrypted storage for settings and API keys |

## Document Index

| Document | Description |
|----------|-------------|
| [git-engine.md](git-engine.md) | Git engine design: git2-rs wrappers, CLI fallback strategy, data models |
| [graph-layout.md](graph-layout.md) | Commit graph layout algorithm: lane assignment, Sugiyama, Canvas rendering |
| [ai-integration.md](ai-integration.md) | AI integration: Ollama/OpenAI dual backends, feature scenarios |
| [frontend-architecture.md](frontend-architecture.md) | Frontend architecture: component tree, state management, IPC patterns |
| [roadmap.md](roadmap.md) | Implementation roadmap: 4 phases, milestones, acceptance criteria |

## Project Structure

```
GitBanshee/
├── src/                          # React frontend
│   ├── App.tsx
│   ├── main.tsx
│   ├── components/
│   │   ├── GraphCanvas/          # Commit graph Canvas renderer
│   │   ├── BranchPanel/          # Branch list
│   │   ├── DiffViewer/           # File diff viewer
│   │   ├── FileExplorer/         # File change tree
│   │   ├── AIAssistant/          # AI chat / suggestion panel
│   │   ├── CommitDetails/        # Commit detail view
│   │   ├── RepoTabs/             # Multi-repo tabs
│   │   └── Common/               # Shared components
│   ├── hooks/                    # Custom hooks
│   ├── stores/                   # Zustand stores
│   ├── types/                    # TypeScript types
│   └── utils/                    # Utility functions
├── src-tauri/
│   ├── src/
│   │   ├── main.rs
│   │   ├── lib.rs                # Tauri app entry point
│   │   ├── commands/             # IPC command handlers
│   │   │   ├── git.rs
│   │   │   ├── repo.rs
│   │   │   └── ai.rs
│   │   ├── git/                  # Git engine
│   │   │   ├── log.rs
│   │   │   ├── diff.rs
│   │   │   ├── branch.rs
│   │   │   ├── operations.rs
│   │   │   └── graph.rs          # Graph layout algorithm
│   │   ├── ai/                   # AI integration
│   │   │   ├── ollama.rs
│   │   │   └── openai.rs
│   │   └── models/               # Data models
│   ├── capabilities/
│   │   └── default.json          # Permission declarations
│   ├── tauri.conf.json
│   └── Cargo.toml
├── docs/                         # Architecture documentation
├── package.json
├── vite.config.ts
└── tailwind.config.js
```
