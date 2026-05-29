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

    for (col, segments) in columns.iter().enumerate() {
        for seg in segments {
            let ci = seg.branch_order % colors.len();

            for (row, sha) in ordered_hashes.iter().enumerate() {
                if row < seg.start_row || row > seg.end_row {
                    continue;
                }
                if commit_col_map.get(sha) != Some(&col) {
                    continue;
                }
                let color = colors[ci].clone();
                commit_color.insert(sha.clone(), color);
                commit_color_idx.insert(sha.clone(), ci);
            }
        }
    }

    (commit_color, commit_color_idx)
}
