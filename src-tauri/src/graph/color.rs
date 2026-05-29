use std::collections::HashMap;
use crate::graph::types::BranchSegment;

pub struct ColorPicker {
    available: Vec<usize>,
    total: usize,
}

impl ColorPicker {
    pub fn new(total: usize) -> Self {
        Self {
            available: (0..total).rev().collect(),
            total,
        }
    }

    pub fn next(&mut self) -> usize {
        if let Some(c) = self.available.pop() {
            return c;
        }
        self.available.push(self.total);
        self.total += 1;
        self.available.pop().unwrap()
    }

    pub fn recycle(&mut self, idx: usize) {
        if !self.available.contains(&idx) {
            self.available.push(idx);
        }
    }
}

pub fn assign_colors(
    columns: &[Vec<BranchSegment>],
    commit_col_map: &HashMap<String, usize>,
    ordered_hashes: &[String],
    colors: &[String],
) -> (HashMap<String, String>, HashMap<String, usize>) {
    let mut commit_color: HashMap<String, String> = HashMap::new();
    let mut commit_color_idx: HashMap<String, usize> = HashMap::new();
    let mut picker = ColorPicker::new(colors.len());

    for (col, segments) in columns.iter().enumerate() {
        for seg in segments {
            let ci = picker.next();

            for (row, sha) in ordered_hashes.iter().enumerate() {
                if row < seg.start_row || row > seg.end_row {
                    continue;
                }
                if commit_col_map.get(sha) != Some(&col) {
                    continue;
                }
                let color = colors[ci % colors.len()].clone();
                commit_color.insert(sha.clone(), color);
                commit_color_idx.insert(sha.clone(), ci % colors.len());
            }

            picker.recycle(ci);
        }
    }

    (commit_color, commit_color_idx)
}
