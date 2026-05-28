use crate::models::StatusEntry;
use git2::{Repository, StatusOptions};
use std::path::Path;

pub fn get_status(repo: &Repository) -> Result<Vec<StatusEntry>, git2::Error> {
    let mut opts = StatusOptions::new();
    opts.include_untracked(true);
    let statuses = repo.statuses(Some(&mut opts))?;
    let mut entries = Vec::new();

    for entry in statuses.iter() {
        let path = entry.path().unwrap_or("").to_string();
        if path.is_empty() {
            continue;
        }
        let flags = entry.status();

        if flags.contains(git2::Status::INDEX_NEW)
            || flags.contains(git2::Status::INDEX_MODIFIED)
            || flags.contains(git2::Status::INDEX_DELETED)
            || flags.contains(git2::Status::INDEX_RENAMED)
            || flags.contains(git2::Status::INDEX_TYPECHANGE)
        {
            entries.push(StatusEntry {
                path: path.clone(),
                status: "staged".into(),
            });
        }

        if flags.contains(git2::Status::WT_NEW)
            || flags.contains(git2::Status::WT_MODIFIED)
            || flags.contains(git2::Status::WT_DELETED)
            || flags.contains(git2::Status::WT_RENAMED)
            || flags.contains(git2::Status::WT_TYPECHANGE)
        {
            let st = if flags.contains(git2::Status::WT_NEW)
                && !flags.contains(git2::Status::INDEX_NEW)
            {
                "untracked"
            } else {
                "unstaged"
            };
            entries.push(StatusEntry {
                path,
                status: st.into(),
            });
        }
    }

    Ok(entries)
}

pub fn stage_file(repo: &Repository, path: &str) -> Result<(), git2::Error> {
    let mut index = repo.index()?;
    index.add_path(Path::new(path))?;
    index.write()?;
    Ok(())
}

pub fn unstage_file(repo: &Repository, path: &str) -> Result<(), git2::Error> {
    let head = repo.head()?.peel_to_commit()?;
    repo.reset_default(Some(head.as_object()), [path])
}

pub fn stage_all(repo_path: &str) -> Result<(), String> {
    let output = std::process::Command::new("git")
        .args(["-C", repo_path, "add", "-A"])
        .output()
        .map_err(|e| e.to_string())?;
    if output.status.success() {
        Ok(())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).to_string())
    }
}
