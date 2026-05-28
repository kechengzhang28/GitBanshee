use crate::git::engine;
use crate::models::{BranchInfo, CommitNode, CrossConnection, DiffContent, LaneSpan};
use serde::{Deserialize, Serialize};
use std::sync::Mutex;

pub struct CommitCache(pub Mutex<Option<(Vec<CommitNode>, Vec<LaneSpan>, Vec<CrossConnection>)>>);

impl CommitCache {
    pub fn new() -> Self {
        Self(Mutex::new(None))
    }

    pub fn clear(&self) {
        *self.0.lock().unwrap() = None;
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
    pub commits: Vec<CommitNode>,
    pub lane_spans: Vec<LaneSpan>,
    pub connections: Vec<CrossConnection>,
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
    let spans;
    let connections;
    let page;

    {
        let cached = cache.0.lock().unwrap();
        if let Some((all, all_spans, all_connections)) = cached.as_ref() {
            let start = offset.min(all.len());
            let end = (offset + limit).min(all.len());
            page = all[start..end].to_vec();
            spans = all_spans.clone();
            connections = all_connections.clone();
            return Ok(GetCommitsResponse {
                commits: page,
                lane_spans: spans,
                connections,
            });
        }
    }

    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    let (all, all_spans, all_connections) = engine::get_all_commits(&repo).map_err(|e| e.to_string())?;

    let start = offset.min(all.len());
    let end = (offset + limit).min(all.len());
    page = all[start..end].to_vec();
    spans = all_spans.clone();
    connections = all_connections.clone();

    *cache.0.lock().unwrap() = Some((all, all_spans, all_connections));
    Ok(GetCommitsResponse { commits: page, lane_spans: spans, connections })
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
