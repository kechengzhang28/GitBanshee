use crate::models::{CommitNode, GraphData, Link, Path, Point};
use std::collections::HashMap;

const PALETTE: [&str; 6] = ["#58a6ff", "#3fb950", "#d29922", "#a371f7", "#f85149", "#39d353"];
const PALETTE_LEN: usize = PALETTE.len();

struct ActivePath {
    next: String,
    lane: usize,
    vertices: Vec<Point>,
    color_index: usize,
}

impl ActivePath {
    fn new(next: String, lane: usize, start_row: usize, color_index: usize) -> Self {
        Self {
            next,
            lane,
            vertices: vec![Point { lane, row: start_row }],
            color_index,
        }
    }
}

struct ColorPicker {
    available: Vec<usize>,
    next: usize,
}

impl ColorPicker {
    fn new() -> Self {
        Self {
            available: (0..PALETTE_LEN).rev().collect(),
            next: 0,
        }
    }

    fn next_color(&mut self) -> usize {
        if let Some(c) = self.available.pop() {
            return c;
        }
        let c = self.next;
        self.next = (self.next + 1) % PALETTE_LEN;
        c
    }

    fn recycle(&mut self, color_index: usize) {
        self.available.push(color_index);
    }
}

pub fn compute_graph_layout(commits: &mut [CommitNode]) -> GraphData {
    if commits.is_empty() {
        return GraphData::default();
    }

    let mut actives: Vec<ActivePath> = vec![];
    let mut color_picker = ColorPicker::new();
    let mut paths: Vec<Path> = vec![];
    let mut links: Vec<Link> = vec![];

    for (row, commit) in commits.iter_mut().enumerate() {
        // === Step 1: Find major (first matching path) and ended (additional matches) ===
        let mut major: Option<usize> = None;
        let mut ended: Vec<usize> = vec![];

        for (i, ap) in actives.iter().enumerate() {
            if ap.next == commit.hash {
                if major.is_none() {
                    major = Some(i);
                } else {
                    ended.push(i);
                }
            }
        }

        // === Step 2: Update major's target ===
        if let Some(m) = major {
            if let Some(next_parent) = commit.parents.first().cloned() {
                actives[m].next = next_parent;
            } else {
                ended.push(m);
            }
        }

        // === Step 3: New branch head (no matching path) ===
        let major = if major.is_none() && !commit.parents.is_empty() {
            let ci = color_picker.next_color();
            let idx = actives.len();
            actives.push(ActivePath::new(
                commit.parents[0].clone(),
                idx,
                row,
                ci,
            ));
            Some(idx)
        } else {
            major
        };

        // === Step 4: Set commit lane/row ===
        let commit_lane = major.map(|m| actives[m].lane).unwrap_or(0);
        commit.lane = commit_lane;
        commit.row = row;

        // === Step 5: Record vertex at commit position for major path ===
        if let Some(m) = major {
            actives[m].vertices.push(Point {
                lane: commit_lane,
                row,
            });
        }

        // === Step 6: Parent[1+] — links or new paths ===
        for parent_hash in commit.parents.iter().skip(1) {
            let existing_idx = actives.iter().position(|p| p.next == *parent_hash);
            if let Some(ei) = existing_idx {
                let target_lane = actives[ei].lane;
                links.push(Link {
                    start: Point {
                        lane: commit_lane,
                        row,
                    },
                    control: Point {
                        lane: target_lane,
                        row,
                    },
                    end: Point {
                        lane: target_lane,
                        row: row.saturating_add(1),
                    },
                    color: PALETTE[actives[ei].color_index % PALETTE_LEN].to_string(),
                });
            } else {
                let ci = color_picker.next_color();
                let idx = actives.len();
                actives.push(ActivePath {
                    next: parent_hash.clone(),
                    lane: idx,
                    vertices: vec![
                        Point {
                            lane: commit_lane,
                            row,
                        },
                        Point {
                            lane: idx,
                            row: row.saturating_add(1),
                        },
                    ],
                    color_index: ci,
                });
            }
        }

        // === Step 7: Terminate ended paths at major's lane ===
        ended.sort();
        for idx in ended.iter().rev() {
            let ap = actives.remove(*idx);
            color_picker.recycle(ap.color_index);
            let mut verts = ap.vertices;
            verts.push(Point {
                lane: commit_lane,
                row,
            });
            paths.push(Path {
                points: verts,
                color: PALETTE[ap.color_index % PALETTE_LEN].to_string(),
            });
        }

        // === Step 8: Update lane positions after removals/insertions ===
        for (i, ap) in actives.iter_mut().enumerate() {
            if ap.lane != i {
                ap.vertices.push(Point { lane: ap.lane, row });
                ap.vertices.push(Point { lane: i, row: row.saturating_add(1) });
                ap.lane = i;
            }
        }
    }

    // === Step 9: Terminate remaining active paths (extend to bottom) ===
    let last_row = commits.len();
    for ap in actives {
        let mut verts = ap.vertices;
        verts.push(Point {
            lane: ap.lane,
            row: last_row,
        });
        paths.push(Path {
            points: verts,
            color: PALETTE[ap.color_index % PALETTE_LEN].to_string(),
        });
    }

    GraphData { paths, links }
}

pub fn assign_decorators(commits: &mut [CommitNode], decorators: &HashMap<String, Vec<String>>) {
    for commit in commits.iter_mut() {
        if let Some(names) = decorators.get(&commit.hash) {
            commit.branches = names.clone();
            commit.branch_to_display = names
                .first()
                .map(|n| ref_display_name(n))
                .unwrap_or_default();
        }
    }
}

fn ref_display_name(full: &str) -> String {
    if let Some(name) = full.strip_prefix("refs/heads/") {
        name.to_string()
    } else if let Some(name) = full.strip_prefix("refs/tags/") {
        format!("tag: {}", name)
    } else if let Some(name) = full.strip_prefix("refs/remotes/") {
        name.to_string()
    } else if full == "HEAD" {
        "HEAD".to_string()
    } else {
        full.to_string()
    }
}
