#![allow(dead_code)]
use std::collections::HashMap;
use git2::{Oid, Repository, Sort};
use crate::graph::sort::temporal_topological_sort;
use crate::graph::layout::{self, assign_columns};
use crate::graph::path::{compute_branch_paths, compute_curves};
use crate::graph::color::assign_colors;
use crate::graph::types::*;

pub struct GraphConfig {
    pub colors: Vec<String>,
    pub initial_count: usize,
    pub load_more_count: usize,
    pub first_parent_only: bool,
}

impl Default for GraphConfig {
    fn default() -> Self {
        Self {
            colors: vec![
                "#58a6ff".into(), "#3fb950".into(), "#d29922".into(),
                "#a371f7".into(), "#f85149".into(), "#39d353".into(),
                "#ffa657".into(), "#db61a2".into(), "#56d4dd".into(),
                "#f0883e".into(),
            ],
            initial_count: 2000,
            load_more_count: 1000,
            first_parent_only: false,
        }
    }
}

pub struct CommitGraph {
    repo: Repository,
    branch_filter: Option<String>,
    config: GraphConfig,
    nodes: HashMap<String, CommitNode>,
    ordered_hashes: Vec<String>,
    column_state: Option<layout::ColumnState>,
    has_more: bool,
    ref_map: HashMap<Oid, Vec<RefInfo>>,
}

impl CommitGraph {
    pub fn open(path: &str, config: GraphConfig) -> Result<Self, String> {
        let repo = Repository::open(path).map_err(|e| e.to_string())?;
        let mut graph = Self {
            repo,
            branch_filter: None,
            config,
            nodes: HashMap::new(),
            ordered_hashes: Vec::new(),
            column_state: None,
            has_more: false,
            ref_map: HashMap::new(),
        };
        graph.load_initial()?;
        Ok(graph)
    }

    pub fn open_with_count(path: &str, count: usize) -> Result<Self, String> {
        let mut config = GraphConfig::default();
        config.initial_count = count;
        Self::open(path, config)
    }

    pub fn refresh(&mut self, branch_filter: Option<&str>) -> Result<(), String> {
        self.nodes.clear();
        self.ordered_hashes.clear();
        self.column_state = None;
        self.branch_filter = branch_filter.map(|s| s.to_string());
        self.load_commits(self.config.initial_count)?;
        self.sort_and_layout();
        Ok(())
    }

    pub fn load_more(&mut self) -> Result<bool, String> {
        let prev_count = self.ordered_hashes.len();
        let loaded = self.load_commits(self.config.load_more_count)?;

        if !loaded || self.ordered_hashes.len() == prev_count {
            self.has_more = false;
            return Ok(false);
        }

        self.sort_and_layout();
        Ok(self.has_more)
    }

    pub fn render(&self) -> Option<RenderData> {
        let cs = self.column_state.as_ref()?;
        let colors = &self.config.colors;

        let (commit_color, commit_color_idx) = assign_colors(
            &cs.columns,
            &cs.commit_col,
            &self.ordered_hashes,
            colors,
        );

        let mut renders = Vec::with_capacity(self.ordered_hashes.len());
        for (i, sha) in self.ordered_hashes.iter().enumerate() {
            let node = self.nodes.get(sha)?;
            let col = cs.commit_col.get(sha).copied().unwrap_or(0);
            let color = commit_color.get(sha).cloned().unwrap_or_else(|| colors[0].clone());
            let dot_type = if node.is_head {
                DotType::Head
            } else if node.parents.len() > 1 {
                DotType::Merge
            } else {
                DotType::Default
            };

            renders.push(PositionedCommit {
                sha: sha.clone(),
                short_sha: sha[..sha.len().min(7)].to_string(),
                col,
                row: i,
                color,
                dot_type,
                author: node.author.clone(),
                message: node.message.clone(),
                committer_date: node.committer_date,
                refs: node.refs.clone(),
                parents: node.parents.clone(),
            });
        }

        let branch_paths = compute_branch_paths(&cs.columns, colors);
        let (merge_curves, fork_curves) = compute_curves(
            &self.ordered_hashes,
            &self.nodes,
            &cs.commit_col,
            &cs.commit_row,
            colors,
            &commit_color_idx,
        );

        Some(RenderData { commits: renders, branch_paths, merge_curves, fork_curves })
    }

    pub fn has_more(&self) -> bool {
        self.has_more
    }
}

// ── Private helpers ─────────────────────────────────────────────────

impl CommitGraph {
    fn load_initial(&mut self) -> Result<(), String> {
        self.load_commits(self.config.initial_count)?;
        self.sort_and_layout();
        Ok(())
    }

    fn load_commits(&mut self, count: usize) -> Result<bool, String> {
        // Create a fresh Revwalk (no longer persisted, avoids unsafe transmute)
        let mut walk = self.repo.revwalk().map_err(|e| e.to_string())?;
        walk.set_sorting(Sort::TIME).map_err(|e| e.to_string())?;

        // Push HEAD
        if let Ok(head) = self.repo.head() {
            if let Some(oid) = head.target() {
                walk.push(oid).map_err(|e| e.to_string())?;
            }
        }

        // Build ref_map and push all refs (only on first load)
        if self.ref_map.is_empty() {
            if let Ok(references) = self.repo.references() {
                for r in references.flatten() {
                    let full_name = r.name().unwrap_or("").to_string();
                    let is_branch = full_name.starts_with("refs/heads/");
                    let is_remote = full_name.starts_with("refs/remotes/");
                    let is_tag = full_name.starts_with("refs/tags/");

                    let included = match self.branch_filter.as_deref() {
                        Some(f) if is_tag => f == "tags",
                        Some(f) if is_remote => f == "remotes",
                        Some(f) => full_name.contains(f),
                        None => is_branch || is_remote || is_tag,
                    };

                    if !included {
                        continue;
                    }

                    let commit_oid = match r.peel_to_commit() {
                        Ok(c) => c.id(),
                        Err(_) => continue,
                    };
                    walk.push(commit_oid).map_err(|e| e.to_string())?;

                    let (kind, display) = classify_ref(&full_name);
                    self.ref_map.entry(commit_oid).or_default().push(RefInfo {
                        kind,
                        name: full_name.clone(),
                        display_name: display.to_string(),
                    });
                }
            }
        }

        let mut loaded = 0;
        loop {
            match walk.next() {
                Some(Ok(id)) => {
                    if self.nodes.contains_key(&id.to_string()) {
                        continue; // Skip already-loaded commits
                    }

                    let commit = match self.repo.find_commit(id) {
                        Ok(c) => c,
                        Err(_) => continue,
                    };
                    let sha = id.to_string();
                    let parents: Vec<String> = commit.parents().map(|p| p.id().to_string()).collect();
                    let author = commit.author();
                    let committer = commit.committer();
                    let time = committer.when().seconds();
                    let author_name = author.name().unwrap_or("Unknown").to_string();
                    let message = commit.message().unwrap_or("").trim().to_string();

                    let mut refs = self.ref_map.get(&id).cloned().unwrap_or_default();
                    let mut is_head = false;
                    if let Ok(head) = self.repo.head() {
                        if head.target() == Some(id) {
                            is_head = true;
                            if let Some(shorthand) = head.shorthand() {
                                refs.push(RefInfo {
                                    kind: RefKind::Head,
                                    name: shorthand.to_string(),
                                    display_name: shorthand.to_string(),
                                });
                            }
                        }
                    }

                    self.nodes.insert(sha.clone(), CommitNode {
                        sha,
                        parents,
                        children: Vec::new(),
                        author: author_name,
                        message,
                        committer_date: time,
                        refs,
                        is_head,
                    });
                    loaded += 1;
                    if loaded >= count {
                        self.has_more = true;
                        break;
                    }
                }
                Some(Err(_)) => continue,
                None => {
                    self.has_more = false;
                    break;
                }
            }
        }

        Ok(loaded > 0)
    }

    fn sort_and_layout(&mut self) {
        let all_shas: Vec<String> = self.nodes.keys().cloned().collect();
        for sha in &all_shas {
            let parents: Vec<String> = self.nodes.get(sha)
                .map(|n| n.parents.clone())
                .unwrap_or_default();
            for parent_sha in &parents {
                if let Some(parent) = self.nodes.get_mut(parent_sha.as_str()) {
                    if !parent.children.contains(sha) {
                        parent.children.push(sha.clone());
                    }
                }
            }
        }

        self.ordered_hashes = temporal_topological_sort(&self.nodes);
        self.column_state = Some(assign_columns(&self.ordered_hashes, &self.nodes));
    }
}

fn classify_ref(full_name: &str) -> (RefKind, &str) {
    if let Some(name) = full_name.strip_prefix("refs/heads/") {
        (RefKind::Branch, name)
    } else if let Some(name) = full_name.strip_prefix("refs/remotes/") {
        (RefKind::RemoteBranch, name)
    } else if let Some(name) = full_name.strip_prefix("refs/tags/") {
        (RefKind::Tag, name)
    } else {
        (RefKind::Branch, full_name)
    }
}
