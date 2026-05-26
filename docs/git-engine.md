# Git Engine Design

## Overview

GitBanshee's Git engine uses **git2-rs (libgit2 bindings)** as the primary driver, falling back to the **git CLI** (via `std::process::Command`) for operations not supported by libgit2.

## Data Models

```rust
// src-tauri/src/models/commit.rs
#[derive(Serialize, Clone)]
pub struct CommitNode {
    pub hash: String,
    pub parents: Vec<String>,
    pub message: String,
    pub author: Author,
    pub timestamp: i64,
    pub branches: Vec<String>,
    pub tags: Vec<String>,
    pub x: f64,    // Graph layout - column coordinate (computed in Rust)
    pub y: f64,    // Graph layout - row coordinate
    pub lane: u32, // Lane assignment number
}

#[derive(Serialize)]
pub struct Author {
    pub name: String,
    pub email: String,
}

#[derive(Serialize)]
pub struct BranchInfo {
    pub name: String,
    pub is_head: bool,
    pub target_hash: String,
    pub upstream: Option<String>,
}

#[derive(Serialize)]
pub struct DiffContent {
    pub files: Vec<DiffFile>,
    pub stats: DiffStats,
}

#[derive(Serialize)]
pub struct DiffFile {
    pub path: String,
    pub status: DiffStatus,  // Added, Modified, Deleted, Renamed
    pub hunks: Vec<DiffHunk>,
}

#[derive(Serialize)]
pub struct DiffHunk {
    pub header: String,
    pub old_start: u32,
    pub old_lines: u32,
    pub new_start: u32,
    pub new_lines: u32,
    pub lines: Vec<DiffLine>,
}

#[derive(Serialize)]
pub struct DiffLine {
    pub origin: char,  // '+' / '-' / ' '
    pub content: String,
    pub old_lineno: Option<u32>,
    pub new_lineno: Option<u32>,
}
```

## Command Reference

| Command | Implementation | Notes |
|---------|---------------|-------|
| `open_repo` | git2-rs | Open repository, validate path, read basic info |
| `get_commits` | git2-rs `Revwalk` | Incremental fetch with offset/limit |
| `get_branches` | git2-rs | Fetch all local/remote branches |
| `get_tags` | git2-rs | Fetch all tags |
| `get_diff` | git2-rs `Diff` | Get diff for a commit or working tree changes |
| `get_file_tree` | git2-rs | Get file tree at a given commit |
| `checkout_branch` | git2-rs | Switch branches |
| `create_branch` | git2-rs | Create a new branch |
| `delete_branch` | git2-rs | Delete a branch |
| `stage_file` | git2-rs `Index` | Stage a file |
| `unstage_file` | git2-rs `Index` | Unstage a file |
| `commit` | git2-rs | Create a commit |
| `merge` | CLI fallback | libgit2 merge has limited support |
| `rebase` | CLI fallback | libgit2 rebase has limited support |
| `stash_push/pop` | git2-rs | Save/restore working tree |
| `cherry_pick` | CLI fallback | libgit2 cherry-pick support is limited |
| `fetch` | CLI fallback | libgit2 fetch implementation is incomplete |
| `push` | CLI fallback | Requires credential handling, CLI is more reliable |
| `pull` | CLI fallback | Combination of fetch + merge |

## Caching Strategy

- Maintain an `LruCache<String, Vec<CommitNode>>` on the Rust side, keyed as `{repo_path}:{offset}:{limit}`
- Invalidate cache on mutating operations (`commit`/`merge`/`rebase` etc.)
- Use `Arc<RwLock<LruCache>>` for concurrent read/write
- Also retain a copy of commits in the Zustand store on the frontend to avoid redundant requests
