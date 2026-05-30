use std::collections::HashMap;
use crate::graph::types::{BranchPath, BranchSegment, ForkCurve, MergeCurve, CommitNode};

pub fn compute_branch_paths(
    columns: &[Vec<BranchSegment>],
    colors: &[String],
) -> Vec<BranchPath> {
    let mut paths = Vec::new();

    for (col, segments) in columns.iter().enumerate() {
        for seg in segments {
            if seg.end_row == usize::MAX || seg.start_row >= seg.end_row {
                continue;
            }

            let color_idx = seg.branch_order % colors.len();
            paths.push(BranchPath {
                col,
                start_row: seg.start_row,
                end_row: seg.end_row,
                color: colors[color_idx].clone(),
            });
        }
    }

    paths
}

pub fn compute_curves(
    ordered_hashes: &[String],
    nodes: &HashMap<String, CommitNode>,
    commit_col: &HashMap<String, usize>,
    commit_row: &HashMap<String, usize>,
    colors: &[String],
    commit_color_idx: &HashMap<String, usize>,
) -> (Vec<MergeCurve>, Vec<ForkCurve>) {
    let mut merge_curves = Vec::new();
    let mut fork_curves = Vec::new();

    for sha in ordered_hashes {
        let commit = match nodes.get(sha) {
            Some(c) => c,
            None => continue,
        };
        let from_col = match commit_col.get(sha) {
            Some(&c) => c,
            None => continue,
        };
        let from_row = match commit_row.get(sha) {
            Some(&r) => r,
            None => continue,
        };

        for (i, parent_sha) in commit.parents.iter().enumerate() {
            if i == 0 {
                continue;
            }
            let to_col = match commit_col.get(parent_sha.as_str()) {
                Some(&c) => c,
                None => continue,
            };
            let to_row = match commit_row.get(parent_sha.as_str()) {
                Some(&r) => r,
                None => continue,
            };
            let color_idx = commit_color_idx.get(parent_sha).copied().unwrap_or(0);
            merge_curves.push(MergeCurve {
                from_col,
                from_row,
                to_col,
                to_row,
                color: colors[color_idx % colors.len()].clone(),
            });
        }

        let mut branch_children: Vec<&String> = commit.children.iter()
            .filter(|c| nodes.get(*c).map(|n| n.parents.first() == Some(sha)).unwrap_or(false))
            .collect();
        branch_children.sort();

        for child_sha in branch_children {
            let child_col = match commit_col.get(child_sha.as_str()) {
                Some(&c) => c,
                None => continue,
            };
            let child_row = match commit_row.get(child_sha.as_str()) {
                Some(&r) => r,
                None => continue,
            };
            if child_col == from_col {
                continue;
            }
            let color_idx = commit_color_idx.get(child_sha.as_str()).copied().unwrap_or(0);
            fork_curves.push(ForkCurve {
                from_col,
                from_row,
                to_col: child_col,
                to_row: child_row,
                color: colors[color_idx % colors.len()].clone(),
            });
        }
    }

    // Sort for deterministic rendering z-order
    merge_curves.sort_by(|a, b| {
        a.from_row.cmp(&b.from_row)
            .then_with(|| a.from_col.cmp(&b.from_col))
            .then_with(|| a.to_col.cmp(&b.to_col))
    });
    fork_curves.sort_by(|a, b| {
        a.from_row.cmp(&b.from_row)
            .then_with(|| a.from_col.cmp(&b.from_col))
            .then_with(|| a.to_col.cmp(&b.to_col))
    });

    (merge_curves, fork_curves)
}
