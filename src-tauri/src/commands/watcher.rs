use notify::{Event, EventKind, RecursiveMode, Watcher};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::{AppHandle, Emitter};

/// Manages active watchers, keyed by repo path.
pub struct WatcherState {
    /// Map of repo path → watcher handle. Dropping the handle stops watching.
    watchers: Mutex<HashMap<String, (notify::RecommendedWatcher, Vec<PathBuf>)>>,
}

impl WatcherState {
    pub fn new() -> Self {
        Self { watchers: Mutex::new(HashMap::new()) }
    }
}

/// Start watching a git repository for changes.
#[tauri::command]
pub fn watch_repo(
    app: AppHandle,
    state: tauri::State<'_, WatcherState>,
    path: String,
) -> Result<(), String> {
    let repo_path = PathBuf::from(&path);

    // Watch the entire repo (including worktree and .git)
    let watch_path = repo_path.clone();

    let app_clone = app.clone();
    let path_clone = path.clone();

    let mut watcher = notify::recommended_watcher(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                if should_refresh(&event) {
                    let _ = app_clone.emit("git-change", path_clone.clone());
                }
            }
        }
    ).map_err(|e| format!("Failed to create watcher: {}", e))?;

    if watch_path.exists() {
        watcher.watch(&watch_path, RecursiveMode::Recursive)
            .map_err(|e| format!("Failed to watch {:?}: {}", watch_path, e))?;
    }

    state.watchers.lock().unwrap().insert(path, (watcher, vec![watch_path]));
    Ok(())
}

/// Stop watching a repository.
#[tauri::command]
pub fn unwatch_repo(
    state: tauri::State<'_, WatcherState>,
    path: String,
) -> Result<(), String> {
    state.watchers.lock().unwrap().remove(&path);
    Ok(())
}

/// Determine if an event should trigger a UI refresh.
fn should_refresh(event: &Event) -> bool {
    for path in &event.paths {
        let path_str = path.to_string_lossy();

        // .git/HEAD changes: branch switch, commit
        if path_str.ends_with("/.git/HEAD") || path_str.ends_with("\\.git\\HEAD") {
            return true;
        }
        // .git/refs changes: branch create/delete, fetch, push, remote tracking
        if path_str.contains("/.git/refs/") || path_str.contains("\\.git\\refs\\") {
            return true;
        }
        // .git/logs changes: all ref log operations
        if path_str.contains("/.git/logs/") || path_str.contains("\\.git\\logs\\") {
            return true;
        }
        // .git/index changes: staging/unstaging
        if path_str.ends_with("/.git/index") || path_str.ends_with("\\.git\\index") {
            return true;
        }
        // FETCH_HEAD: after fetch
        if path_str.ends_with("/.git/FETCH_HEAD") || path_str.ends_with("\\.git\\FETCH_HEAD") {
            return true;
        }
        // MERGE_HEAD, CHERRY_PICK_HEAD, REBASE_HEAD etc.
        if path_str.contains("/.git/") || path_str.contains("\\.git\\") {
            // Exclude .git/objects (noisy, doesn't indicate state change)
            if path_str.contains("/objects/") || path_str.contains("\\objects\\") {
                continue;
            }
            // Exclude .git/lfs (noisy)
            if path_str.contains("/lfs/") || path_str.contains("\\lfs\\") {
                continue;
            }
            return true;
        }
    }

    // Worktree file changes (outside .git) - only if it's a modify/create/remove event
    if !event.paths.iter().any(|p| {
        let s = p.to_string_lossy();
        s.contains("/.git/") || s.contains("\\.git\\")
    }) {
        match event.kind {
            EventKind::Modify(_) | EventKind::Create(_) | EventKind::Remove(_) => return true,
            _ => {}
        }
    }

    false
}
