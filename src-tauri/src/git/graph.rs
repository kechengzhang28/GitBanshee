use crate::models::CommitNode;
use std::collections::{HashMap, HashSet};

pub fn assign_lanes(commits: &mut [CommitNode]) {
    let n = commits.len();
    if n == 0 {
        return;
    }

    let hashes: Vec<String> = commits.iter().map(|c| c.hash.clone()).collect();
    let rev_index: HashMap<String, usize> = hashes
        .iter()
        .enumerate()
        .map(|(i, h)| (h.clone(), i))
        .collect();

    let mut lane_map: HashMap<String, usize> = HashMap::new();
    let mut next_lane: usize = 0;
    let mut free_lanes: Vec<usize> = Vec::new();

    for row in 0..n {
        commits[row].row = row;
        let hash = &commits[row].hash;
        let parents = commits[row].parents.clone();

        let is_merge = parents.len() > 1;
        let is_branch_tip = !has_child_in_range(hash, row, &rev_index, commits);

        if is_branch_tip {
            let lane = allocate_lane(&mut free_lanes, &mut next_lane);
            lane_map.insert(hash.clone(), lane);
        }

        if is_merge {
            let mut parent_lanes: Vec<usize> = Vec::with_capacity(parents.len());
            for parent_hash in &parents {
                let lane = lane_map
                    .get(parent_hash)
                    .copied()
                    .unwrap_or_else(|| {
                        let l = allocate_lane(&mut free_lanes, &mut next_lane);
                        lane_map.insert(parent_hash.clone(), l);
                        l
                    });
                parent_lanes.push(lane);
            }
            let main_lane = parent_lanes[0];
            lane_map.insert(hash.clone(), main_lane);
            for &lane in &parent_lanes[1..] {
                if lane != main_lane
                    && !is_lane_used_after(row, lane, &lane_map, &hashes, commits)
                {
                    free_lanes.push(lane);
                }
            }
        } else if let Some(parent_hash) = parents.first() {
            let lane = lane_map
                .get(parent_hash.as_str())
                .copied()
                .unwrap_or_else(|| {
                    let l = allocate_lane(&mut free_lanes, &mut next_lane);
                    lane_map.insert(parent_hash.clone(), l);
                    l
                });
            lane_map.insert(hash.clone(), lane);
        } else if !is_branch_tip {
            let lane = allocate_lane(&mut free_lanes, &mut next_lane);
            lane_map.insert(hash.clone(), lane);
        }
    }

    for commit in commits.iter_mut() {
        commit.lane = lane_map.get(&commit.hash).copied().unwrap_or(0);
    }
}

fn has_child_in_range(
    hash: &str,
    row: usize,
    rev_index: &HashMap<String, usize>,
    commits: &[CommitNode],
) -> bool {
    let own_idx = rev_index.get(hash).copied().unwrap_or(row);
    for commit in commits.iter() {
        if let Some(&ci) = rev_index.get(&commit.hash) {
            if ci < own_idx && commit.parents.contains(&hash.to_string()) {
                return true;
            }
        }
    }
    false
}

fn allocate_lane(free: &mut Vec<usize>, next: &mut usize) -> usize {
    free.pop().unwrap_or_else(|| {
        let lane = *next;
        *next += 1;
        lane
    })
}

fn is_lane_used_after(
    row: usize,
    lane: usize,
    lane_map: &HashMap<String, usize>,
    hashes: &[String],
    commits: &[CommitNode],
) -> bool {
    let next_hashes: HashSet<&str> = commits[row + 1..]
        .iter()
        .flat_map(|c| c.parents.iter().map(|p| p.as_str()))
        .collect();

    hashes.iter().any(|h| {
        lane_map.get(h).copied() == Some(lane) && next_hashes.contains(h.as_str())
    })
}
