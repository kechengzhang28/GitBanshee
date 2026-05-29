use crate::git::engine;
use crate::graph::{CommitGraph, RenderData};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

pub struct CommitCache {
    pub data: Mutex<Option<RenderData>>,
    pub max_loaded: Mutex<usize>,
}

impl CommitCache {
    pub fn new() -> Self {
        Self {
            data: Mutex::new(None),
            max_loaded: Mutex::new(0),
        }
    }

    pub fn clear(&self) {
        *self.data.lock().unwrap() = None;
        *self.max_loaded.lock().unwrap() = 0;
    }
}

#[derive(Serialize, Deserialize)]
pub struct OpenRepoResult {
    pub path: String,
    pub branch_count: usize,
    pub commit_count: usize,
}

#[derive(Serialize)]
pub struct GetCommitsResponse {
    pub commits: Vec<crate::graph::PositionedCommit>,
    pub branch_paths: Vec<crate::graph::BranchPath>,
    pub merge_curves: Vec<crate::graph::MergeCurve>,
    pub fork_curves: Vec<crate::graph::ForkCurve>,
}

#[tauri::command]
pub fn open_repo(cache: tauri::State<'_, CommitCache>, path: String) -> Result<OpenRepoResult, String> {
    cache.clear();
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
pub fn get_commits(
    cache: tauri::State<'_, CommitCache>,
    path: String,
    offset: usize,
    limit: usize,
) -> Result<GetCommitsResponse, String> {
    let needed = offset + limit;

    {
        let cached = cache.data.lock().unwrap();
        if let Some(data) = cached.as_ref() {
            if needed <= data.commits.len() {
                let start = offset.min(data.commits.len());
                let end = needed.min(data.commits.len());
                return Ok(GetCommitsResponse {
                    commits: data.commits[start..end].to_vec(),
                    branch_paths: data.branch_paths.clone(),
                    merge_curves: data.merge_curves.clone(),
                    fork_curves: data.fork_curves.clone(),
                });
            }
        }
    }

    let count = needed.max(2000);
    let graph = CommitGraph::open_with_count(&path, count)?;
    let data = graph.render().ok_or("no commits")?;

    let start = offset.min(data.commits.len());
    let end = needed.min(data.commits.len());

    let response = GetCommitsResponse {
        commits: data.commits[start..end].to_vec(),
        branch_paths: data.branch_paths.clone(),
        merge_curves: data.merge_curves.clone(),
        fork_curves: data.fork_curves.clone(),
    };

    *cache.data.lock().unwrap() = Some(data);
    Ok(response)
}

#[tauri::command]
pub fn get_branches(path: String) -> Result<Vec<crate::models::BranchInfo>, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    engine::get_branches(&repo).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_commit_diff(path: String, hash: String) -> Result<crate::models::DiffContent, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    engine::get_commit_diff(&repo, &hash).map_err(|e| e.to_string())
}
