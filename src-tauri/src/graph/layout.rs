use std::collections::HashMap;
use crate::graph::types::{BranchSegment, CommitNode};

const ROW_INF: usize = usize::MAX;

#[derive(Debug)]
pub struct ColumnState {
    pub columns: Vec<Vec<BranchSegment>>,
    pub commit_col: HashMap<String, usize>,
    pub commit_row: HashMap<String, usize>,
}

pub fn assign_columns(
    ordered_hashes: &[String],
    nodes: &HashMap<String, CommitNode>,
) -> ColumnState {
    let mut columns: Vec<Vec<BranchSegment>> = Vec::new();
    let mut commit_col: HashMap<String, usize> = HashMap::new();
    let mut commit_row: HashMap<String, usize> = HashMap::new();
    let mut branch_order: usize = 0;

    for (row, sha) in ordered_hashes.iter().enumerate() {
        commit_row.insert(sha.clone(), row);

        let commit = match nodes.get(sha) {
            Some(c) => c,
            None => continue,
        };

        let mut branch_children: Vec<&String> = commit.children.iter()
            .filter(|c| nodes.get(*c).map(|n| n.parents.first() == Some(sha)).unwrap_or(false))
            .collect();
        branch_children.sort();

        let has_branch_children = !branch_children.is_empty();
        let has_children = !commit.children.is_empty();

        let col = if !has_children {
            columns.push(vec![BranchSegment {
                start_row: row,
                end_row: if commit.parents.is_empty() { row } else { ROW_INF },
                end_sha: sha.clone(),
                branch_order,
            }]);
            branch_order += 1;
            columns.len() - 1
        } else if has_branch_children {
            let mut child_cols: Vec<usize> = branch_children.iter()
                .filter_map(|c| commit_col.get(*c).copied())
                .collect();
            child_cols.sort();

            let chosen_col = child_cols[0];

            if let Some(last_seg) = columns[chosen_col].last_mut() {
                last_seg.end_row = ROW_INF;
                last_seg.end_sha = sha.clone();
            }

            for &cc in &child_cols[1..] {
                if let Some(seg) = columns[cc].last_mut() {
                    seg.end_row = row.saturating_sub(1);
                }
            }

            chosen_col
        } else {
            let mut children_with_cols: Vec<(String, usize)> = commit.children.iter()
                .filter_map(|c| commit_col.get(c).map(|&col| (c.clone(), col)))
                .collect();
            children_with_cols.sort();

            let min_child_row = children_with_cols.iter()
                .filter_map(|(c, _)| commit_row.get(c).copied())
                .min()
                .unwrap_or(row);

            let max_child_col = children_with_cols.iter()
                .map(|(_, col)| *col)
                .max()
                .unwrap_or(0);

            let found = (max_child_col + 1..columns.len()).find(|&col| {
                columns[col].last().map_or(true, |seg| min_child_row >= seg.end_row)
            });

            if let Some(col) = found {
                columns[col].push(BranchSegment {
                    start_row: min_child_row.saturating_add(1),
                    end_row: if commit.parents.is_empty() { row } else { ROW_INF },
                    end_sha: sha.clone(),
                    branch_order,
                });
                branch_order += 1;
                col
            } else {
                columns.push(vec![BranchSegment {
                    start_row: min_child_row.saturating_add(1),
                    end_row: if commit.parents.is_empty() { row } else { ROW_INF },
                    end_sha: sha.clone(),
                    branch_order,
                }]);
                branch_order += 1;
                columns.len() - 1
            }
        };

        commit_col.insert(sha.clone(), col);
    }

    // Close all remaining open segments
    let last_row = ordered_hashes.len().saturating_sub(1);
    for col_segs in &mut columns {
        if let Some(last) = col_segs.last_mut() {
            if last.end_row == ROW_INF {
                last.end_row = last_row;
            }
        }
    }

    ColumnState { columns, commit_col, commit_row }
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use crate::graph::types::CommitNode;
    use super::assign_columns;

    fn make(sha: &str, parents: &[&str], children: &[&str]) -> CommitNode {
        CommitNode {
            sha: sha.to_string(),
            parents: parents.iter().map(|s| s.to_string()).collect(),
            children: children.iter().map(|s| s.to_string()).collect(),
            author: "test".into(),
            message: "test".into(),
            committer_date: 1000,
            refs: vec![],
            is_head: false,
        }
    }

    #[test]
    fn single_branch_linear() {
        let mut nodes = HashMap::new();
        nodes.insert("c".into(), make("c", &["b"], &[]));
        nodes.insert("b".into(), make("b", &["a"], &["c"]));
        nodes.insert("a".into(), make("a", &[], &["b"]));
        let ordered = vec!["c".to_string(), "b".to_string(), "a".to_string()];
        let state = assign_columns(&ordered, &nodes);
        assert_eq!(state.commit_col.get("c"), Some(&0));
        assert_eq!(state.commit_col.get("b"), Some(&0));
        assert_eq!(state.columns.len(), 1);
    }

    #[test]
    fn fork_two_branches() {
        let mut nodes = HashMap::new();
        nodes.insert("c".into(), make("c", &["b"], &[]));
        nodes.insert("d".into(), make("d", &["b"], &[]));
        nodes.insert("b".into(), make("b", &["a"], &["c", "d"]));
        nodes.insert("a".into(), make("a", &[], &["b"]));
        let ordered: Vec<String> = vec!["c", "d", "b", "a"].iter().map(|s| s.to_string()).collect();
        let state = assign_columns(&ordered, &nodes);
        assert!(state.columns.len() >= 2);
        let b_col = state.commit_col.get("b").unwrap();
        let c_col = state.commit_col.get("c").unwrap();
        let d_col = state.commit_col.get("d").unwrap();
        assert_eq!(b_col, c_col.min(d_col));
    }

    #[test]
    fn merge_two_branches() {
        let mut nodes = HashMap::new();
        nodes.insert("e".into(), make("e", &["c", "f"], &[]));
        nodes.insert("f".into(), make("f", &["d"], &["e"]));
        nodes.insert("c".into(), make("c", &["b"], &["e"]));
        nodes.insert("d".into(), make("d", &["b"], &["f"]));
        nodes.insert("b".into(), make("b", &["a"], &["c", "d"]));
        nodes.insert("a".into(), make("a", &[], &["b"]));
        let ordered: Vec<String> = vec!["e", "f", "c", "d", "b", "a"].iter().map(|s| s.to_string()).collect();
        let state = assign_columns(&ordered, &nodes);
        let e_col = state.commit_col.get("e").unwrap();
        let f_col = state.commit_col.get("f").unwrap();
        let c_col = state.commit_col.get("c").unwrap();
        assert_eq!(e_col, c_col, "E and C share first-parent chain column");
        assert_ne!(e_col, f_col, "F should be in different column from E");
    }
}
