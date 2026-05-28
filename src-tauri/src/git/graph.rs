use crate::models::CommitNode;

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
