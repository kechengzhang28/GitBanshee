use crate::commands::repo::CommitCache;
use crate::git::{branch, engine, worktree};
use crate::models::StatusEntry;
use serde::Serialize;

#[derive(Serialize)]
pub struct CommitResult {
    pub hash: String,
    pub short_hash: String,
}

#[tauri::command]
pub fn get_status(path: String) -> Result<Vec<StatusEntry>, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    worktree::get_status(&repo).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn stage_file(path: String, file_path: String) -> Result<(), String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    worktree::stage_file(&repo, &file_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn unstage_file(path: String, file_path: String) -> Result<(), String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    worktree::unstage_file(&repo, &file_path).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn stage_all(path: String) -> Result<(), String> {
    worktree::stage_all(&path)
}

#[tauri::command]
pub fn create_commit(
    cache: tauri::State<'_, CommitCache>,
    path: String,
    message: String,
    amend: bool,
) -> Result<CommitResult, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    let oid = engine::create_commit(&repo, &message, amend).map_err(|e| e.to_string())?;
    let short = oid.to_string().chars().take(7).collect();
    cache.clear();
    Ok(CommitResult {
        hash: oid.to_string(),
        short_hash: short,
    })
}

#[tauri::command]
pub fn create_branch(path: String, name: String) -> Result<(), String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    branch::create_branch(&repo, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn delete_branch(path: String, name: String) -> Result<(), String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    branch::delete_branch(&repo, &name).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn checkout_branch(
    cache: tauri::State<'_, CommitCache>,
    path: String,
    name: String,
) -> Result<(), String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    branch::checkout_branch(&repo, &name).map_err(|e| e.to_string())?;
    cache.clear();
    Ok(())
}

#[tauri::command]
pub fn checkout_commit(
    cache: tauri::State<'_, CommitCache>,
    path: String,
    hash: String,
) -> Result<(), String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    engine::checkout_commit(&repo, &hash).map_err(|e| e.to_string())?;
    cache.clear();
    Ok(())
}
