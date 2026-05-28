use crate::models::CommitNode;
use std::collections::{BTreeSet, HashMap};

pub fn assign_lanes(commits: &mut [CommitNode]) {
    if commits.is_empty() {
        return;
    }

    let mut lane_map: HashMap<String, usize> = HashMap::new();
    let mut next_lane: usize = 0;

    for (row, commit) in commits.iter_mut().enumerate() {
        commit.row = row;
        let hash = &commit.hash;
        let parents = &commit.parents;

        let lane = *lane_map.entry(hash.clone()).or_insert_with(|| {
            let l = next_lane;
            next_lane += 1;
            l
        });

        for (idx, parent_hash) in parents.iter().enumerate() {
            lane_map.entry(parent_hash.clone()).or_insert_with(|| {
                if idx == 0 {
                    lane
                } else {
                    let l = next_lane;
                    next_lane += 1;
                    l
                }
            });
        }
    }

    // Compact lanes
    let used: BTreeSet<usize> = lane_map.values().copied().collect();
    let mut remap: HashMap<usize, usize> = HashMap::new();
    for (new_lane, old_lane) in used.iter().enumerate() {
        remap.insert(*old_lane, new_lane);
    }

    for commit in commits.iter_mut() {
        let old = lane_map.get(&commit.hash).copied().unwrap_or(0);
        commit.lane = remap.get(&old).copied().unwrap_or(0);
    }
}
