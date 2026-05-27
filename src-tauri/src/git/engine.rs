use crate::git::graph::assign_lanes;
use crate::models::{BranchInfo, CommitNode};
use git2::{BranchType, Repository, Sort};

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
        let upstream = None;
        result.push(BranchInfo {
            name,
            is_head,
            target_commit: target,
            upstream,
        });
    }

    Ok(result)
}
