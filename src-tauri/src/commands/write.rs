use crate::commands::repo::CommitCache;
use crate::git::{branch, engine, remote, stash, worktree};
use crate::models::{StashEntry, StatusEntry};
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

#[tauri::command]
pub fn fetch_remote(path: String, remote_name: String) -> Result<String, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    remote::fetch(&repo, &remote_name)
}

#[tauri::command]
pub fn pull(
    cache: tauri::State<'_, CommitCache>,
    path: String,
    remote_name: String,
    branch: String,
) -> Result<String, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    let result = remote::pull(&repo, &remote_name, &branch)?;
    cache.clear();
    Ok(result)
}

#[tauri::command]
pub fn push(path: String, remote_name: String) -> Result<String, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    remote::push(&repo, &remote_name)
}

// ---- Stash commands ----

#[tauri::command]
pub fn stash_list(path: String) -> Result<Vec<StashEntry>, String> {
    let mut repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    stash::stash_list(&mut repo)
}

#[tauri::command]
pub fn stash_save(path: String, message: Option<String>) -> Result<String, String> {
    let mut repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    stash::stash_save(&mut repo, message.as_deref())
}

#[tauri::command]
pub fn stash_pop(
    cache: tauri::State<'_, CommitCache>,
    path: String,
    index: usize,
) -> Result<String, String> {
    let mut repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    let result = stash::stash_pop(&mut repo, index)?;
    cache.clear();
    Ok(result)
}

#[tauri::command]
pub fn stash_apply(
    cache: tauri::State<'_, CommitCache>,
    path: String,
    index: usize,
) -> Result<String, String> {
    let mut repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    let result = stash::stash_apply(&mut repo, index)?;
    cache.clear();
    Ok(result)
}

#[tauri::command]
pub fn stash_drop(path: String, index: usize) -> Result<String, String> {
    let mut repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    stash::stash_drop(&mut repo, index)
}

// ---- Cherry-pick commands ----

#[tauri::command]
pub fn cherry_pick(
    cache: tauri::State<'_, CommitCache>,
    path: String,
    commit_hash: String,
) -> Result<String, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    let result = cherry_pick_op(&repo, &commit_hash)?;
    cache.clear();
    Ok(result)
}

// ---- Rebase commands ----

#[tauri::command]
pub fn rebase_start(
    cache: tauri::State<'_, CommitCache>,
    path: String,
    onto_branch: String,
) -> Result<String, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    let result = rebase_op(&repo, &onto_branch)?;
    cache.clear();
    Ok(result)
}

#[tauri::command]
pub fn rebase_continue(
    cache: tauri::State<'_, CommitCache>,
    path: String,
) -> Result<String, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    let result = rebase_continue_op(&repo)?;
    cache.clear();
    Ok(result)
}

#[tauri::command]
pub fn rebase_abort(
    cache: tauri::State<'_, CommitCache>,
    path: String,
) -> Result<String, String> {
    let repo = engine::open_repo(&path).map_err(|e| e.to_string())?;
    let result = rebase_abort_op(&repo)?;
    cache.clear();
    Ok(result)
}

// ---- helper functions for cherry-pick and rebase ----

fn cherry_pick_op(repo: &git2::Repository, commit_hash: &str) -> Result<String, String> {
    let oid = git2::Oid::from_str(commit_hash)
        .map_err(|e| format!("Invalid OID: {e}"))?;
    let commit = repo.find_commit(oid)
        .map_err(|e| format!("Commit not found: {e}"))?;

    repo.cherrypick(&commit, Some(&mut git2::CherrypickOptions::new()))
        .map_err(|e| format!("Cherry-pick failed: {e}"))?;

    let has_conflicts = repo.index()
        .map_err(|e| format!("{e}"))?
        .has_conflicts();

    if has_conflicts {
        return Err(
            "Cherry-pick resulted in conflicts.\n\
             Resolve conflicts manually, stage resolved files, then commit.".into()
        );
    }

    let tree_id = {
        let mut index = repo.index().map_err(|e| format!("{e}"))?;
        index.write_tree().map_err(|e| format!("{e}"))?
    };
    let tree = repo.find_tree(tree_id).map_err(|e| format!("{e}"))?;
    let sig = repo.signature().map_err(|e| format!("{e}"))?;
    let head = repo.head().map_err(|e| format!("{e}"))?.peel_to_commit().map_err(|e| format!("{e}"))?;

    let cherry_picked_oid = repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        commit.message().unwrap_or(""),
        &tree,
        &[&head],
    ).map_err(|e| format!("Cherry-pick commit failed: {e}"))?;

    Ok(format!("Cherry-picked {}", &cherry_picked_oid.to_string()[..7]))
}

fn rebase_op(repo: &git2::Repository, onto_branch: &str) -> Result<String, String> {
    let onto_ref = repo.find_reference(&format!("refs/heads/{onto_branch}"))
        .or_else(|_| repo.find_reference(&format!("refs/remotes/origin/{onto_branch}")))
        .map_err(|e| format!("Branch '{}' not found: {e}", onto_branch))?;
    let onto_commit = onto_ref.peel_to_commit()
        .map_err(|e| format!("Resolve onto commit: {e}"))?;
    let onto_annotated = repo.reference_to_annotated_commit(&onto_ref)
        .map_err(|e| format!("Annotate onto: {e}"))?;

    let head = repo.head().map_err(|e| format!("No HEAD: {e}"))?;
    let head_annotated = repo.reference_to_annotated_commit(&head)
        .map_err(|e| format!("Annotate HEAD: {e}"))?;

    let merge_base = repo.merge_base(onto_commit.id(), head_annotated.id())
        .map_err(|e| format!("Find merge-base: {e}"))?;

    if merge_base == onto_commit.id() {
        return Ok("Already based on target branch".into());
    }

    let branch_name = head.shorthand().unwrap_or("HEAD");

    // rebase: branch, upstream, onto, opts
    let mut rebase = repo.rebase(
        None,
        Some(&onto_annotated),
        None,
        None,
    ).map_err(|e| format!("Rebase init failed: {e}"))?;

    let sig = repo.signature().map_err(|e| format!("{e}"))?;
    let mut count = 0usize;

    while let Some(op) = rebase.next() {
        let _op = op.map_err(|e| format!("Rebase step error: {e}"))?;
        rebase.commit(None, &sig, None)
            .map_err(|e| format!("Rebase commit step: {e}"))?;
        count += 1;
    }

    rebase.finish(Some(&sig))
        .map_err(|e| format!("Rebase finish failed: {e}"))?;

    repo.set_head(&format!("refs/heads/{branch_name}"))
        .map_err(|e| format!("Set HEAD: {e}"))?;
    repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))
        .map_err(|e| format!("Checkout: {e}"))?;

    Ok(format!("Rebase complete: {} commit(s) replayed", count))
}

fn is_rebase_in_progress(repo: &git2::Repository) -> bool {
    use git2::RepositoryState;
    matches!(
        repo.state(),
        RepositoryState::RebaseMerge
            | RepositoryState::RebaseInteractive
            | RepositoryState::Rebase
    )
}

fn rebase_continue_op(repo: &git2::Repository) -> Result<String, String> {
    if !is_rebase_in_progress(repo) {
        return Err("No rebase in progress".into());
    }
    // Use git CLI for continue/abort as git2 has limited rebase-open support
    run_git_cli(repo, &["rebase", "--continue"])
}

fn rebase_abort_op(repo: &git2::Repository) -> Result<String, String> {
    if !is_rebase_in_progress(repo) {
        return Err("No rebase in progress".into());
    }
    run_git_cli(repo, &["rebase", "--abort"])
}

fn run_git_cli(repo: &git2::Repository, args: &[&str]) -> Result<String, String> {
    let workdir = repo.workdir()
        .ok_or("No workdir found")?;
    let output = std::process::Command::new("git")
        .args(args)
        .current_dir(workdir)
        .output()
        .map_err(|e| format!("Failed to run git: {e}"))?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
        Ok(if stdout.is_empty() { "OK".into() } else { stdout })
    } else {
        let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
        Err(stderr)
    }
}
