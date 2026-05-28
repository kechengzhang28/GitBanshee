use crate::git::graph::assign_lanes;
use crate::models::{BranchInfo, CommitNode, DiffContent, DiffFile, DiffHunk, DiffLine};
use git2::{BranchType, DiffOptions, Repository, Sort};

pub fn open_repo(path: &str) -> Result<Repository, git2::Error> {
    Repository::open(path)
}

pub fn count_commits(repo: &Repository) -> Result<usize, git2::Error> {
    let mut revwalk = repo.revwalk()?;
    revwalk.set_sorting(Sort::TOPOLOGICAL)?;
    revwalk.push_head()?;
    Ok(revwalk.count())
}

pub fn get_commits(
    repo: &Repository,
    offset: usize,
    limit: usize,
) -> Result<Vec<CommitNode>, git2::Error> {
    let mut revwalk = repo.revwalk()?;
    revwalk.set_sorting(Sort::TOPOLOGICAL)?;
    revwalk.push_head()?;

    let oids: Vec<git2::Oid> = revwalk
        .skip(offset)
        .take(limit)
        .filter_map(|r| r.ok())
        .collect();
    let mut commits = Vec::with_capacity(oids.len());

    for (row, oid) in oids.iter().enumerate() {
        let commit = repo.find_commit(*oid)?;
        let parents: Vec<String> = commit.parent_ids().map(|p| p.to_string()).collect();
        commits.push(CommitNode {
            hash: oid.to_string(),
            short_hash: oid.to_string().chars().take(7).collect(),
            message: commit.message().unwrap_or("").to_string(),
            author: commit.author().name().unwrap_or("").to_string(),
            email: commit.author().email().unwrap_or("").to_string(),
            timestamp: commit.time().seconds(),
            parents,
            lane: 0,
            row: offset + row,
        });
    }

    assign_lanes(&mut commits);
    Ok(commits)
}

pub fn get_branches(repo: &Repository) -> Result<Vec<BranchInfo>, git2::Error> {
    let branches = repo.branches(Some(BranchType::Local))?;
    let mut result = Vec::new();

    for branch in branches {
        let (b, _bt) = branch?;
        let name = b.name()?.unwrap_or("").to_string();
        let target = b.get().target().map(|oid| oid.to_string());
        let is_head = b.is_head();
        let upstream = b.upstream().ok().and_then(|u| {
            u.name().ok().flatten().map(|n| n.to_string())
        });
        result.push(BranchInfo {
            name,
            is_head,
            target_commit: target,
            upstream,
        });
    }

    Ok(result)
}

pub fn get_commit_diff(repo: &Repository, hash: &str) -> Result<DiffContent, git2::Error> {
    let oid = git2::Oid::from_str(hash).map_err(|e| git2::Error::from_str(&e.to_string()))?;
    let commit = repo.find_commit(oid)?;
    let tree = commit.tree()?;

    let parent_tree = if commit.parent_count() > 0 {
        Some(commit.parent(0)?.tree()?)
    } else {
        None
    };

    let mut diff_opts = DiffOptions::new();
    diff_opts.context_lines(3);

    let diff = repo.diff_tree_to_tree(
        parent_tree.as_ref(),
        Some(&tree),
        Some(&mut diff_opts),
    )?;

    let mut files: Vec<DiffFile> = Vec::new();

    for i in 0..diff.deltas().count() {
        let patch = match git2::Patch::from_diff(&diff, i) {
            Ok(Some(p)) => p,
            _ => continue,
        };
        let delta = diff.deltas().nth(i).unwrap();

        let status = match delta.status() {
            git2::Delta::Added => "added",
            git2::Delta::Deleted => "deleted",
            git2::Delta::Modified => "modified",
            git2::Delta::Renamed => "renamed",
            _ => "modified",
        }
        .to_string();

        let path = delta
            .new_file()
            .path()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        let mut hunks: Vec<DiffHunk> = Vec::new();
        let (mut additions, mut deletions) = (0usize, 0usize);

        for h in 0..patch.num_hunks() {
            let (hunk, lines) = patch.hunk(h)?;
            let header = String::from_utf8_lossy(hunk.header()).to_string();
            let mut hunk_lines = Vec::new();

            for li in 0..lines {
                let line = patch.line_in_hunk(h, li)?;
                let content = String::from_utf8_lossy(line.content()).to_string();
                let kind = match line.origin() {
                    '+' => {
                        additions += 1;
                        "addition"
                    }
                    '-' => {
                        deletions += 1;
                        "deletion"
                    }
                    _ => "context",
                };

                hunk_lines.push(DiffLine {
                    kind: kind.to_string(),
                    content,
                    old_lineno: line.old_lineno().map(|n| n as usize),
                    new_lineno: line.new_lineno().map(|n| n as usize),
                });
            }

            hunks.push(DiffHunk {
                header,
                lines: hunk_lines,
            });
        }

        if !hunks.is_empty() {
            files.push(DiffFile {
                path,
                status,
                hunks,
                additions,
                deletions,
            });
        }
    }

    Ok(DiffContent { files })
}

pub fn create_commit(
    repo: &Repository,
    message: &str,
    amend: bool,
) -> Result<git2::Oid, git2::Error> {
    let sig = repo.signature()?;
    let mut index = repo.index()?;
    let tree_oid = index.write_tree()?;
    let tree = repo.find_tree(tree_oid)?;

    if amend {
        let head = repo.head()?.peel_to_commit()?;
        let parents: Vec<git2::Commit> = head.parents().collect();
        let parent_refs: Vec<&git2::Commit> = parents.iter().collect();
        let oid = repo.commit(
            Some("HEAD"),
            &sig,
            &sig,
            message,
            &tree,
            &parent_refs,
        )?;
        Ok(oid)
    } else if let Ok(head) = repo.head() {
        if let Ok(parent) = head.peel_to_commit() {
            let oid = repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &[&parent])?;
            return Ok(oid);
        }
        let oid = repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &[])?;
        Ok(oid)
    } else {
        let oid = repo.commit(Some("HEAD"), &sig, &sig, message, &tree, &[])?;
        Ok(oid)
    }
}

pub fn checkout_commit(repo: &Repository, hash: &str) -> Result<(), git2::Error> {
    let oid =
        git2::Oid::from_str(hash).map_err(|e| git2::Error::from_str(&e.to_string()))?;
    let commit = repo.find_commit(oid)?;
    let mut opts = git2::build::CheckoutBuilder::new();
    opts.force();
    repo.checkout_tree(commit.as_object(), Some(&mut opts))?;
    repo.set_head_detached(oid)?;
    Ok(())
}
