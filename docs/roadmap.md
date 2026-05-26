# Implementation Roadmap

## Phase 1 — Skeleton Setup

**Goal:** A running Tauri app that can open a repository and display the commit list.

### Task Checklist

- [ ] Initialize Tauri v2 project (`npm create tauri-app`)
- [ ] Configure Rust side: add git2, serde, tokio, etc. to Cargo.toml
- [ ] Set up frontend skeleton: React + Vite + TypeScript + Tailwind
- [ ] Create Zustand stores (repoStore, uiStore)
- [ ] Implement core Git commands on Rust side:
  - `open_repo` — git2-rs open repository
  - `get_commits` — Revwalk incremental fetch (offset/limit)
  - `get_branches` — branch list
- [ ] Implement frontend repo selection page (load local repo)
- [ ] Implement basic commit list (DOM rendering, not Canvas)

### Acceptance Criteria

```
1. App launches and displays welcome page
2. Clicking "Open Repository" opens a folder picker
3. Commit list displays correctly (hash, message, author, date)
4. Scrolling loads more commits incrementally
5. Branch list displays correctly
```

---

## Phase 2 — Graph Rendering

**Goal:** Canvas-based commit graph with full interaction.

### Task Checklist

- [ ] Implement `graph.rs` on Rust side: lane assignment algorithm
- [ ] Implement commit coordinate computation on Rust side
- [ ] Implement `GraphCanvas` component on frontend:
  - Canvas 2D rendering pipeline
  - Lane background lines / bezier curves / circle nodes
  - Hover to highlight branch line
  - Click to select commit
- [ ] Implement virtual scrolling on frontend
- [ ] Implement zoom/pan
- [ ] Color palette system (12-color cycling)

### Acceptance Criteria

```
1. Commit graph renders correctly (no lane overlap, clear connections)
2. Branch merge scenarios display correctly (cross-lane curves)
3. Clicking a commit highlights it
4. Hovering highlights the related branch line
5. Scrolling is smooth (test with 10K commits)
6. Zoom and pan work correctly
```

---

## Phase 3 — Git Operations

**Goal:** Complete Git operation workflow.

### Task Checklist

- [ ] Implement `DiffViewer` component (syntax highlighting, line numbers, inline diff)
- [ ] Implement `FileExplorer` component
- [ ] Implement `CommitDetails` panel
- [ ] Implement `git_operation` command on Rust side:
  - stage / unstage
  - commit (with amend)
  - branch CRUD
  - checkout
  - merge (CLI fallback)
  - rebase (CLI fallback)
  - stash (push / pop / list)
  - fetch / push / pull (CLI fallback)
- [ ] Operation result feedback (success/failure toast)
- [ ] Auto-refresh graph data after operations

### Acceptance Criteria

```
1. Files can be staged/unstaged
2. Changes can be committed (graph auto-refreshes)
3. Branches can be created/deleted/switched
4. Merge and rebase execute correctly
5. Fetch/push/pull work correctly
6. Diff viewer renders correctly
7. Error messages are reasonable
```

---

## Phase 4 — AI Integration + Polish

**Goal:** Native AI features + application maturity.

### Task Checklist

- [ ] Rust-side AI engine (Ollama + OpenAI dual backends)
- [ ] Frontend `AIAssistant` panel (conversational UI)
- [ ] AI feature scenarios:
  - Commit message generation (from staged diff)
  - Code review (triggered from selected commit)
  - Repository context Q&A
  - Branch naming suggestions
- [ ] Settings page (AI backend config, API key, model selection)
- [ ] tauri-plugin-store integration for settings persistence
- [ ] Theme toggle (light/dark)
- [ ] Multi-repo tab support
- [ ] Performance optimization testing
- [ ] Error handling and edge case refinement

### Acceptance Criteria

```
1. AI features work after configuring Ollama
2. Commit message generation produces reasonable results
3. Code review identifies real issues
4. API key is stored securely
5. AI functionality can be toggled on/off normally
6. Light/dark themes are consistent and polished
7. Overall operation is smooth with no noticeable lag
```

---

## Milestone Estimates

| Phase | Estimated Effort | Deliverable |
|-------|-----------------|-------------|
| Phase 1 | 3-5 days | App that opens repos and browses commit lists |
| Phase 2 | 5-7 days | Full commit graph view with Canvas rendering |
| Phase 3 | 7-10 days | Complete Git operation capability |
| Phase 4 | 5-7 days | AI features + application polish |

> Note: Estimates assume an experienced solo developer familiar with Tauri + React. Learning curve time is additional.
