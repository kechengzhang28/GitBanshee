# Implementation Roadmap

Development follows a gradual expansion from MVP to production-ready release.

---

## v0.1 — MVP: Visualized Graph

**Goal:** Open a repository and see an interactive commit graph.

- Initialize the Tauri v2 project with React + TypeScript + Tailwind scaffolding (`ui/` + `engine/`).
- Set up the theme system infrastructure: CSS custom property variables, Tailwind integration, built-in dark and light themes.
- Set up the i18n framework (English only, but the architecture is in place for future locales).
- Set up CI pipeline: lint, type-check, basic cross-platform build.
- Implement IPC commands: open a repository, fetch commit list (paginated), list branches.
- Build the Canvas commit graph: lane assignment algorithm (Rust), multi-layer rendering pipeline, click-to-select, hover-to-highlight, virtual scrolling.

### Acceptance Criteria

1. App launches and opens a repository via folder picker.
2. Commit graph renders with correct lane assignment and parent-child connections.
3. Clicking a commit shows its metadata (hash, author, message, date).
4. Scrolling handles 10K+ commits without visible lag.
5. CI passes lint, type-check, and produces builds.

---

## v0.2 — Readable Diffs

**Goal:** Inspect what changed in a commit or the working tree.

- Build the DiffViewer: line-level diff with syntax coloring.
- Build the FileExplorer: file change tree for a commit or working directory.
- Enhance the CommitDetails panel: show changed files and inline diffs.
- Polish zoom and pan interactions on the graph.

### Acceptance Criteria

1. Selecting a commit shows its file changes in the diff viewer.
2. Added, removed, and modified lines are visually distinct.
3. File tree reflects the changed files correctly.
4. Zoom and pan on the graph are smooth and bounded.

---

## v0.3 — Writable Operations

**Goal:** Turn the app from a viewer into a tool — make changes to a repository.

- Stage and unstage files from the working directory.
- Create commits (with amend support).
- Create, delete, and switch branches.
- Checkout commits and branches.
- Show operation progress and success/failure feedback.
- Auto-refresh the graph after state-changing operations.

### Acceptance Criteria

1. Files can be staged and unstaged.
2. A commit can be created; the graph refreshes to include it.
3. Branches can be created, deleted, and switched without errors.
4. Checkout updates the working directory and graph correctly.
5. Error messages are clear and actionable when operations fail.

---

## v0.4 — Advanced Git

**Goal:** Cover the full Git workflow, including remote and history manipulation.

- Merge branches with conflict detection and resolution guidance.
- Rebase and cherry-pick support.
- Stash: push, pop, list.
- Fetch, push, and pull from remotes.
- Surface conflict information clearly when operations cannot auto-complete.

### Acceptance Criteria

1. Merge and rebase execute correctly; conflicts are reported with affected files.
2. Stash operations work (push, pop, apply, list).
3. Fetch, push, and pull function against configured remotes.
4. The graph and branch list stay consistent after complex history manipulations.

---

## v0.5 — AI Integration

**Goal:** Native AI features as a competitive differentiator.

- Build the AI engine on the Rust side with dual-backend routing (Ollama + OpenAI).
- Build the AI assistant panel on the frontend with conversational UI.
- Implement the four AI features:
  - Commit message generation (from staged diff)
  - Code review (from selected commit diff)
  - Repository Q&A (context-aware chat)
  - Branch naming suggestions
- Build the settings page for AI configuration and model selection.
- Integrate encrypted persistence for API keys.

### Acceptance Criteria

1. AI features function after configuring at least one backend (local or cloud).
2. Commit message generation follows the Conventional Commits specification.
3. Code review identifies real, actionable issues in the diff.
4. API keys are stored encrypted and never appear in logs or error messages.
5. AI functionality can be fully disabled.

---

## v0.6 — Polish & Release

**Goal:** Production-ready release with user customization and platform coverage.

- Enable user-defined themes via `~/.gitbanshee/themes/`: scan, load, validate, hot-edit.
- Complete i18n coverage: English and Simplified Chinese across all components.
- Add multi-repository tab support.
- Set up code signing in CI: Authenticode (Windows), Notarization (macOS), GPG (Linux).
- Verify signed installers on each target platform.
- Performance profiling and optimization (memory, scroll, initial load).
- Edge-case handling and error recovery.

### Acceptance Criteria

1. User themes are loaded, validated, and applied without restart.
2. All user-facing text has both English and Chinese variants.
3. Multiple repositories can be open simultaneously and switched between.
4. Signed installers are produced by CI and pass OS-level trust checks on each platform.
5. The application operates with no perceptible UI lag across all supported workflows.
