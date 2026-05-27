# Git Engine Design

## Overview

GitBanshee's Git engine uses **libgit2** (via Rust bindings) as the primary driver, falling back to the **system Git CLI** for operations that libgit2 has limited support for.

## Dual-Driver Strategy

### libgit2 (Primary)

Core Git operations are performed through native Rust bindings to libgit2. This provides direct memory access, no process-spawning overhead, and full control over error handling. Operations handled through libgit2 include:

- Repository opening and validation
- Commit log traversal (revwalk)
- Branch and tag listing
- Diff computation
- File tree reading
- Staging and unstaging
- Commit creation
- Stash operations
- Basic branch operations (create, delete, switch)

### CLI Fallback

For operations where libgit2's implementation is incomplete or unreliable, the engine falls back to invoking the system `git` binary as a subprocess. This ensures correct behavior for:

- Merging (conflict resolution scenarios)
- Rebasing (complex history rewriting)
- Cherry-picking
- Fetching from remotes (credential handling)
- Pushing to remotes
- Pulling (fetch + merge combinations)

## Data Models

Data models are defined as Rust structs with serialization support, passed across the IPC boundary to the frontend. Key models:

- **CommitNode** — a single commit in the graph: hash, parent references, author metadata, timestamp, branch/tag associations, and computed layout coordinates (lane and position)
- **BranchInfo** — branch metadata: name, HEAD status, target commit, optional upstream tracking
- **DiffContent** — full diff result: per-file changes with hunk-level detail
- **DiffHunk** / **DiffLine** — granular diff representation supporting line-level rendering in the diff viewer

All models are serializable (JSON via IPC), with layout coordinates pre-computed on the Rust side so the frontend receives render-ready data.

## Caching Strategy

An in-memory LRU cache on the Rust side stores fetched commit data keyed by repository path and range. This avoids re-reading Git history for operations like branch switching or returning to a previously viewed range. The cache is invalidated on any mutating operation (commit, merge, rebase) to ensure consistency. The frontend also retains a copy in its state store for immediate UI updates without IPC roundtrips.
