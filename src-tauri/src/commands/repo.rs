use crate::git::engine;
use crate::models::{BranchInfo, CommitNode, DiffContent};
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct OpenRepoResult {
    pub path: String,
    pub branch_count: usize,
    pub commit_count: usize,
}

#[tauri::command]
pub fn open_repo(path: String) -> Result<OpenRepoResult, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    let branches = engine::get_branches(&repo).map_err(|e| e.to_string())?;
    let commit_count = engine::count_commits(&repo).map_err(|e| e.to_string())?;
    Ok(OpenRepoResult {
        path,
        branch_count: branches.len(),
        commit_count,
    })
}

#[tauri::command]
pub fn get_commits(path: String, offset: usize, limit: usize) -> Result<Vec<CommitNode>, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    engine::get_commits(&repo, offset, limit).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_branches(path: String) -> Result<Vec<BranchInfo>, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    engine::get_branches(&repo).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_commit_diff(path: String, hash: String) -> Result<DiffContent, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    engine::get_commit_diff(&repo, &hash).map_err(|e| e.to_string())
}
