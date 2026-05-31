use crate::git::engine;
use crate::git::worktree;
use crate::graph::{BranchPath, CommitGraph, DotType, PositionedCommit, RenderData};
use crate::models::RemoteInfo;
use base64::Engine;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};

pub struct CommitCache {
    pub data: Mutex<HashMap<String, RenderData>>,
}

impl CommitCache {
    pub fn new() -> Self {
        Self {
            data: Mutex::new(HashMap::new()),
        }
    }

    pub fn clear(&self, path: &str) {
        self.data.lock().unwrap().remove(path);
    }
}

/// Cache for author avatar images, backed by in-memory state + disk files.
///
/// **In-memory layer:** `HashMap<email, (data_url_or_none, Instant)>`
/// Fast path for repeated lookups within TTL. Cleared on app restart.
///
/// **Disk layer:** `{cache_dir}/avatars/{md5(email)}.png` files + `index.json`
/// Survives app restarts. Index maps email-hash → unix timestamp of last resolution.
/// Whether the value is positive (avatar cached) or negative (no avatar)
/// is determined by whether the corresponding .png file exists on disk.
const AVATAR_CACHE_TTL: Duration = Duration::from_secs(24 * 60 * 60); // 24 hours

pub struct AvatarCache {
    /// In-memory cache: email → (data_url_or_none, cached_at)
    pub data: Mutex<HashMap<String, (Option<String>, Instant)>>,
    /// Root directory for persisted avatar cache files
    dir: PathBuf,
}

impl AvatarCache {
    pub fn new(dir: PathBuf) -> Self {
        let _ = std::fs::create_dir_all(&dir);
        Self {
            data: Mutex::new(HashMap::new()),
            dir,
        }
    }

    /// Build an md5 hash of the email for use as a filesystem-safe key.
    fn email_key(email: &str) -> String {
        format!("{:x}", md5::compute(email.as_bytes()))
    }

    fn image_path(&self, email: &str) -> PathBuf {
        self.dir.join(format!("{}.png", Self::email_key(email)))
    }

    fn index_path(&self) -> PathBuf {
        self.dir.join("index.json")
    }

    /// Try to load an avatar image from the disk cache.
    /// Returns Some(base64_data_url) on success, None if not cached or expired.
    fn load_from_disk(&self, email: &str) -> Option<String> {
        let key = Self::email_key(email);
        let index: HashMap<String, u64> = self.read_index().ok()?;
        let ts = index.get(&key)?;

        // Check TTL: has the cache entry expired?
        let age = Self::unix_now().saturating_sub(*ts);
        if age >= AVATAR_CACHE_TTL.as_secs() {
            return None; // expired — will re-fetch
        }

        let path = self.image_path(email);
        if !path.exists() {
            return None; // negative cache: no file means "no avatar"
        }

        let bytes = std::fs::read(&path).ok()?;
        let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
        Some(format!("data:image/png;base64,{}", b64))
    }

    /// Check if the disk cache has a valid "no avatar" negative entry for this email.
    fn has_no_avatar_disk(&self, email: &str) -> bool {
        let key = Self::email_key(email);
        if let Ok(index) = self.read_index() {
            if let Some(&ts) = index.get(&key) {
                let age = Self::unix_now().saturating_sub(ts);
                if age < AVATAR_CACHE_TTL.as_secs() && !self.image_path(email).exists() {
                    return true;
                }
            }
        }
        false
    }

    /// Download an avatar image from a URL, save it to disk, and return a base64 data URL.
    fn download_and_cache(&self, email: &str, url: &str) -> Result<String, String> {
        let response = reqwest::blocking::Client::new()
            .get(url)
            .header("User-Agent", "GitBanshee")
            .send()
            .map_err(|e| format!("Failed to download avatar: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Avatar download returned {}", response.status()));
        }

        let bytes = response
            .bytes()
            .map_err(|e| format!("Failed to read avatar bytes: {}", e))?;

        // Save to disk
        let path = self.image_path(email);
        std::fs::write(&path, &bytes)
            .map_err(|e| format!("Failed to write avatar file: {}", e))?;

        // Update index
        self.write_index_entry(email, Self::unix_now());

        let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
        Ok(format!("data:image/png;base64,{}", b64))
    }

    /// Mark an email as "no avatar available" in the disk index.
    fn mark_no_avatar(&self, email: &str) {
        // Remove any stale image file from a previous positive cache
        let path = self.image_path(email);
        let _ = std::fs::remove_file(&path);
        // Record the current timestamp — absence of the .png file makes this a negative cache
        self.write_index_entry(email, Self::unix_now());
    }

    fn read_index(&self) -> Result<HashMap<String, u64>, String> {
        let path = self.index_path();
        if !path.exists() {
            return Ok(HashMap::new());
        }
        let content = std::fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read avatar index: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse avatar index: {}", e))
    }

    fn write_index_entry(&self, email: &str, ts: u64) {
        let key = Self::email_key(email);
        let mut index = self.read_index().unwrap_or_default();
        index.insert(key, ts);
        if let Ok(json) = serde_json::to_string(&index) {
            let _ = std::fs::write(self.index_path(), json);
        }
    }

    fn unix_now() -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
    }
}

#[derive(Serialize, Deserialize)]
pub struct OpenRepoResult {
    pub path: String,
    pub branch_count: usize,
    pub commit_count: usize,
}

/// Parse a git remote URL and extract platform type, owner, repo name, and avatar URL.
/// Supported formats:
///   - HTTPS: https://github.com/owner/repo.git
///   - SSH:   git@github.com:owner/repo
fn parse_remote_url(url: &str) -> Option<RemoteInfo> {
    let url = url.trim();

    // HTTPS format: https://github.com/<owner>/<repo>...
    if let Some(rest) = url.strip_prefix("https://github.com/") {
        let mut parts = rest.splitn(2, '/');
        let owner = parts.next()?.split('.').next()?;
        let repo = parts.next().map(|r| r.trim_end_matches(".git"));
        if owner.is_empty() {
            return None;
        }
        return Some(RemoteInfo {
            platform: Some("github".to_string()),
            owner: Some(owner.to_string()),
            repo: repo.map(|r| r.to_string()),
            avatar_url: Some(format!("https://github.com/{}.png", owner)),
        });
    }

    // SSH format: git@github.com:<owner>/<repo>...
    if let Some(rest) = url.strip_prefix("git@github.com:") {
        let mut parts = rest.splitn(2, '/');
        let owner = parts.next()?;
        let repo = parts.next().map(|r| r.trim_end_matches(".git"));
        if owner.is_empty() {
            return None;
        }
        return Some(RemoteInfo {
            platform: Some("github".to_string()),
            owner: Some(owner.to_string()),
            repo: repo.map(|r| r.to_string()),
            avatar_url: Some(format!("https://github.com/{}.png", owner)),
        });
    }

    None
}

#[derive(Serialize)]
pub struct GetCommitsResponse {
    pub commits: Vec<crate::graph::PositionedCommit>,
    pub branch_paths: Vec<crate::graph::BranchPath>,
    pub merge_curves: Vec<crate::graph::MergeCurve>,
    pub fork_curves: Vec<crate::graph::ForkCurve>,
}

#[tauri::command]
pub fn open_repo(_cache: tauri::State<'_, CommitCache>, path: String) -> Result<OpenRepoResult, String> {
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
        if let Some(cd) = cached.get(&path) {
            if needed <= cd.commits.len() {
                let has_uncommitted = offset == 0 && detect_uncommitted(&path);
                return Ok(build_response(cd, offset, limit, has_uncommitted));
            }
        }
    }

    let has_uncommitted = offset == 0 && detect_uncommitted(&path);
    let count = needed.max(2000);
    let graph = CommitGraph::open_with_count(&path, count)?;
    let data = graph.render().ok_or("no commits")?;

    let response = build_response(&data, offset, limit, has_uncommitted);

    cache.data.lock().unwrap().insert(path.clone(), data);
    Ok(response)
}

/// Check if the repo has staged or unstaged changes.
fn detect_uncommitted(path: &str) -> bool {
    engine::open_repo(path)
        .ok()
        .and_then(|repo| worktree::get_status(&repo).ok())
        .map(|entries| !entries.is_empty())
        .unwrap_or(false)
}

/// Build a response, optionally injecting an uncommitted node at offset 0.
fn build_response(
    data: &RenderData,
    offset: usize,
    limit: usize,
    has_uncommitted: bool,
) -> GetCommitsResponse {
    let needed = offset + limit;
    let start = offset.min(data.commits.len());
    let end = needed.min(data.commits.len());

    if !has_uncommitted {
        return GetCommitsResponse {
            commits: data.commits[start..end].to_vec(),
            branch_paths: data.branch_paths.clone(),
            merge_curves: data.merge_curves.clone(),
            fork_curves: data.fork_curves.clone(),
        };
    }

    let mut commits: Vec<PositionedCommit> = data.commits[start..end].to_vec();
    let mut branch_paths = data.branch_paths.clone();
    let mut merge_curves = data.merge_curves.clone();
    let mut fork_curves = data.fork_curves.clone();

    let head_info: Option<(usize, &str)> = data.commits.iter()
        .find(|c| matches!(c.dot_type, DotType::Head))
        .map(|c| (c.col, c.color.as_str()));
    let (head_col, head_color) = head_info.unwrap_or((0, "#d29922"));

    for c in &mut commits {
        c.row += 1;
    }
    for bp in &mut branch_paths {
        bp.start_row += 1;
        bp.end_row += 1;
    }
    for mc in &mut merge_curves {
        mc.from_row += 1;
        mc.to_row += 1;
    }
    for fc in &mut fork_curves {
        fc.from_row += 1;
        fc.to_row += 1;
    }

    branch_paths.push(BranchPath {
        col: head_col,
        start_row: 0,
        end_row: 1,
        color: head_color.to_string(),
        dashed: true,
    });

    let uncommitted = PositionedCommit {
        sha: "__UNCOMMITTED__".into(),
        short_sha: "__UNCOMMITTED__".into(),
        col: head_col,
        row: 0,
        color: head_color.to_string(),
        dot_type: DotType::Uncommitted,
        author: String::new(),
        author_email: String::new(),
        message: "Uncommitted changes".into(),
        committer_date: 0,
        refs: vec![],
        parents: vec![],
    };
    commits.insert(0, uncommitted);

    GetCommitsResponse {
        commits,
        branch_paths,
        merge_curves,
        fork_curves,
    }
}

#[tauri::command]
pub fn get_branches(path: String) -> Result<Vec<crate::models::BranchInfo>, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    engine::get_branches(&repo).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_tags(path: String) -> Result<Vec<crate::models::TagInfo>, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    engine::get_tags(&repo).map_err(|e| e.to_string())
}

/// Lightweight status check for focus-refresh optimization.
/// Returns the current HEAD SHA and whether there are uncommitted changes.
#[derive(Serialize)]
pub struct HeadStatus {
    pub head_sha: String,
    pub has_uncommitted: bool,
}

#[tauri::command]
pub fn get_head_status(path: String) -> Result<HeadStatus, String> {
    let head_sha = engine::get_head_sha(&path);
    let has_uncommitted = detect_uncommitted(&path);
    Ok(HeadStatus { head_sha, has_uncommitted })
}

#[tauri::command]
pub fn get_commit_diff(path: String, hash: String) -> Result<crate::models::DiffContent, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    engine::get_commit_diff(&repo, &hash).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn get_remote_info(path: String) -> Result<Option<RemoteInfo>, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    let config = repo.config().map_err(|e| format!("Failed to read git config: {}", e))?;

    // Read remote.origin.url
    let url = match config.get_string("remote.origin.url") {
        Ok(u) => u,
        Err(_) => return Ok(None), // No origin remote — not an error, just no avatar
    };

    Ok(parse_remote_url(&url))
}

/// GitHub usernames: alphanumeric + single hyphens, 1–39 chars,
/// cannot start or end with a hyphen, no consecutive hyphens.
fn is_likely_github_username(s: &str) -> bool {
    if s.is_empty() || s.len() > 39 {
        return false;
    }
    let bytes = s.as_bytes();
    if !bytes[0].is_ascii_alphanumeric() || !bytes[bytes.len() - 1].is_ascii_alphanumeric() {
        return false;
    }
    let mut prev_hyphen = false;
    for &b in bytes {
        if b == b'-' {
            if prev_hyphen {
                return false;
            }
            prev_hyphen = true;
        } else if b.is_ascii_alphanumeric() {
            prev_hyphen = false;
        } else {
            return false;
        }
    }
    true
}

/// Look up the GitHub username for a commit author via the GitHub Commits API.
/// Returns the GitHub login (username) if found.
fn github_api_lookup_author(
    owner: &str,
    repo: &str,
    sha: &str,
) -> Result<Option<String>, String> {
    let url = format!(
        "https://api.github.com/repos/{}/{}/commits/{}",
        owner, repo, sha
    );

    let response = reqwest::blocking::Client::new()
        .get(&url)
        .header("User-Agent", "GitBanshee")
        .header("Accept", "application/vnd.github.v3+json")
        .send()
        .map_err(|e| format!("GitHub API request failed: {}", e))?;

    if !response.status().is_success() {
        return Ok(None);
    }

    let json: serde_json::Value = response
        .json()
        .map_err(|e| format!("Failed to parse GitHub API response: {}", e))?;

    // Extract author.login from the response
    let login = json
        .pointer("/author/login")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string());

    Ok(login)
}

#[tauri::command]
pub fn get_author_avatar(
    path: String,
    sha: String,
    cache: tauri::State<'_, AvatarCache>,
) -> Result<Option<String>, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;

    let is_github = repo
        .config()
        .ok()
        .and_then(|c| c.get_string("remote.origin.url").ok())
        .and_then(|url| parse_remote_url(&url));

    // Look up the commit by SHA
    let oid = git2::Oid::from_str(&sha).map_err(|e| format!("Invalid SHA: {}", e))?;
    let commit = repo.find_commit(oid).map_err(|e| format!("Commit not found: {}", e))?;
    let author = commit.author();

    let email = author.email().unwrap_or("").trim().to_lowercase();
    let name = author.name().unwrap_or("");

    // ── Layer 1: In-memory cache ──
    {
        let cached = cache.data.lock().unwrap();
        if let Some((result, ts)) = cached.get(&email) {
            if ts.elapsed() < AVATAR_CACHE_TTL {
                return Ok(result.clone());
            }
        }
    }

    // ── Layer 2: Disk cache ──
    if let Some(data_url) = cache.load_from_disk(&email) {
        cache.data.lock().unwrap().insert(email.clone(), (Some(data_url.clone()), Instant::now()));
        return Ok(Some(data_url));
    }
    if cache.has_no_avatar_disk(&email) {
        cache.data.lock().unwrap().insert(email.clone(), (None, Instant::now()));
        return Ok(None);
    }

    // ── Layer 3: Resolve URLs → try download → cache ──
    let candidate_urls = collect_candidate_urls(&is_github, &email, name, &sha);

    let mut result = None;
    for url in &candidate_urls {
        match cache.download_and_cache(&email, url) {
            Ok(data_url) => {
                result = Some(data_url);
                break;
            }
            Err(_) => continue, // try next candidate
        }
    }

    if result.is_none() {
        cache.mark_no_avatar(&email);
    }

    cache.data.lock().unwrap().insert(email, (result.clone(), Instant::now()));
    Ok(result)
}

/// Collect candidate avatar URLs ordered by reliability (most authoritative first).
/// The caller tries to download each URL in order and stops at the first success.
fn collect_candidate_urls(
    is_github: &Option<RemoteInfo>,
    email: &str,
    name: &str,
    sha: &str,
) -> Vec<String> {
    let mut urls = Vec::new();

    // 1. GitHub repos: try GitHub API (authoritative) then heuristics
    if let Some(ref remote) = is_github {
        if let (Some(ref owner), Some(ref repo_name)) = (&remote.owner, &remote.repo) {
            if let Ok(Some(login)) = github_api_lookup_author(owner, repo_name, sha) {
                urls.push(format!("https://github.com/{}.png", login));
            }
        }
        // Heuristic candidates (each is a guess, try all)
        for username in collect_heuristic_usernames(email, name) {
            urls.push(format!("https://github.com/{}.png", username));
        }
    }

    // 2. Gravatar as universal fallback
    if let Ok(Some(url)) = gravatar_url(email) {
        urls.push(url);
    }

    urls
}

/// Collect heuristic candidate GitHub usernames from email and name.
/// Ordered by reliability: noreply email > email local part > author name.
fn collect_heuristic_usernames(email: &str, name: &str) -> Vec<String> {
    let mut usernames = Vec::new();

    // Priority 1: noreply GitHub email
    if email.ends_with("@users.noreply.github.com") {
        let local = email.trim_end_matches("@users.noreply.github.com");
        if let Some((_, username)) = local.rsplit_once('+') {
            if !username.is_empty() {
                usernames.push(username.to_string());
            }
        }
        if !local.is_empty() {
            usernames.push(local.to_string());
        }
    }

    // Priority 2: email local part (many use the same handle everywhere)
    if let Some(local) = email.split('@').next() {
        let local = local.to_lowercase();
        if is_likely_github_username(&local) {
            usernames.push(local);
        }
    }

    // Priority 3: display name (least reliable — "Kecheng Zhang" probably isn't "kecheng-zhang")
    let name_candidate = name.trim().to_lowercase().replace(' ', "-");
    if is_likely_github_username(&name_candidate) && !usernames.contains(&name_candidate) {
        usernames.push(name_candidate);
    }

    usernames
}

/// Build a Gravatar avatar URL from an email address.
/// Returns None for empty emails.
fn gravatar_url(email: &str) -> Result<Option<String>, String> {
    let trimmed = email.trim().to_lowercase();
    if trimmed.is_empty() {
        return Ok(None);
    }
    let hash = format!("{:x}", md5::compute(trimmed.as_bytes()));
    Ok(Some(format!(
        "https://www.gravatar.com/avatar/{}?s=80&d=404",
        hash
    )))
}
