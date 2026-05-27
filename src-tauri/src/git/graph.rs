use crate::models::CommitNode;
use std::collections::HashMap;

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

    for commit in commits.iter_mut() {
        commit.lane = lane_map.get(&commit.hash).copied().unwrap_or(0);
    }
}
