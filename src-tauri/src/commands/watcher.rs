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
        let is_git_internal = path_str.contains("/.git/") || path_str.contains("\\.git\\");

        if is_git_internal {
            if path_str.contains("/objects/") || path_str.contains("\\objects\\")
                || path_str.contains("/lfs/") || path_str.contains("\\lfs\\")
            {
                continue;
            }
            return true;
        } else {
            match event.kind {
                EventKind::Modify(_) | EventKind::Create(_) | EventKind::Remove(_) => return true,
                _ => {}
            }
        }
    }

    false
}
