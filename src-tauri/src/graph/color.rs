use std::collections::HashMap;
use crate::graph::types::BranchSegment;

pub fn assign_colors(
    columns: &[Vec<BranchSegment>],
    commit_col_map: &HashMap<String, usize>,
    ordered_hashes: &[String],
    colors: &[String],
) -> (HashMap<String, String>, HashMap<String, usize>) {
    let mut commit_color: HashMap<String, String> = HashMap::new();
    let mut commit_color_idx: HashMap<String, usize> = HashMap::new();

    let mut col_rows: Vec<Vec<(usize, &String)>> = vec![Vec::new(); columns.len()];
    for (row, sha) in ordered_hashes.iter().enumerate() {
        if let Some(&col) = commit_col_map.get(sha) {
            if col < col_rows.len() {
                col_rows[col].push((row, sha));
            }
        }
    }

    for (col, segments) in columns.iter().enumerate() {
        let rows = &col_rows[col];
        for seg in segments {
            let ci = seg.branch_order % colors.len();
            let color = &colors[ci];

            let start = match rows.binary_search_by(|(r, _)| r.cmp(&seg.start_row)) {
                Ok(i) => i,
                Err(i) => i,
            };
            for &(row, sha) in &rows[start..] {
                if row > seg.end_row {
                    break;
                }
                commit_color.insert(sha.clone(), color.clone());
                commit_color_idx.insert(sha.clone(), ci);
            }
        }
    }

    (commit_color, commit_color_idx)
}
