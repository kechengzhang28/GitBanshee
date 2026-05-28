use crate::models::{CommitNode, LaneSpan};
use std::collections::HashMap;

pub fn assign_lanes(commits: &mut [CommitNode]) {
    if commits.is_empty() {
        return;
    }

    let mut columns: Vec<Option<String>> = Vec::new();

    for (row, commit) in commits.iter_mut().enumerate() {
        commit.row = row;
        let hash = &commit.hash;
        let parents = &commit.parents;

        let col = find_column(&columns, hash).unwrap_or_else(|| {
            // Not yet placed: find first free column
            find_free_column(&mut columns, None)
        });
        // Free this commit's column before assigning parents
        if col < columns.len() {
            columns[col] = None;
        }
        commit.lane = col;

        for (idx, parent_hash) in parents.iter().enumerate() {
            if idx == 0 {
                // First parent: stays in commit's column (straight line)
                let old_col = find_column(&columns, parent_hash);
                if let Some(oc) = old_col {
                    if oc != col {
                        columns[oc] = None;
                    }
                }
                if col >= columns.len() {
                    columns.resize(col + 1, None);
                }
                columns[col] = Some(parent_hash.clone());
            } else {
                // Extra parent: find free column for new branch
                let existing_col = find_column(&columns, parent_hash);
                if existing_col.is_some() {
                    // Already placed by another child — leave it (merge point)
                    continue;
                }
                let pcol = find_free_column(&mut columns, Some(col));
                columns[pcol] = Some(parent_hash.clone());
            }
        }
    }
}

fn find_column(columns: &[Option<String>], hash: &str) -> Option<usize> {
    columns.iter().position(|entry| entry.as_deref() == Some(hash))
}

fn find_free_column(columns: &mut Vec<Option<String>>, skip: Option<usize>) -> usize {
    let candidate = columns.iter().position(|entry| entry.is_none());
    if let Some(c) = candidate {
        if let Some(s) = skip {
            if c == s {
                // Current column is also free (rare edge case), look for next
                let next = columns[s + 1..].iter().position(|e| e.is_none());
                if let Some(n) = next {
                    return s + 1 + n;
                }
            }
        }
        return c;
    }
    columns.push(None);
    columns.len() - 1
}

pub fn compute_lane_spans(commits: &[CommitNode]) -> Vec<LaneSpan> {
    if commits.is_empty() {
        return Vec::new();
    }

    let mut hash_to_row: HashMap<&str, usize> = HashMap::new();
    for (row, c) in commits.iter().enumerate() {
        hash_to_row.insert(&c.hash, row);
    }

    // Build spans: vertical lane spans from child row to parent row
    let mut spans: Vec<LaneSpan> = Vec::new();
    for (row, c) in commits.iter().enumerate() {
        for parent_hash in &c.parents {
            if let Some(&parent_row) = hash_to_row.get(parent_hash.as_str()) {
                let vertical_lane = c.lane.max(commits[parent_row].lane);
                if row < parent_row {
                    spans.push(LaneSpan {
                        lane: vertical_lane,
                        start_row: row,
                        end_row: parent_row,
                    });
                }
            }
        }
    }

    // Sort by lane, then start_row for merging
    spans.sort_by(|a, b| a.lane.cmp(&b.lane).then_with(|| a.start_row.cmp(&b.start_row)));

    // Merge overlapping spans per lane
    let mut merged: Vec<LaneSpan> = Vec::new();
    for span in spans {
        if let Some(last) = merged.last_mut() {
            if last.lane == span.lane && last.end_row >= span.start_row {
                last.end_row = last.end_row.max(span.end_row);
                continue;
            }
        }
        merged.push(span);
    }

    merged
}
