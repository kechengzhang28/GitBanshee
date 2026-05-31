use std::collections::{HashMap, HashSet};
use crate::graph::types::CommitNode;

pub fn temporal_topological_sort(nodes: &HashMap<String, CommitNode>) -> Vec<String> {
    let mut commits: Vec<&CommitNode> = nodes.values().collect();
    commits.sort_by(|a, b| {
        b.committer_date.cmp(&a.committer_date)
            .then_with(|| a.sha.cmp(&b.sha))
    });

    let mut sorted: Vec<String> = Vec::with_capacity(nodes.len());
    let mut visited: HashSet<&str> = HashSet::with_capacity(nodes.len());

    for commit in &commits {
        let mut stack = vec![(commit.sha.as_str(), false)];

        while let Some((sha, processed)) = stack.pop() {
            if processed {
                sorted.push(sha.to_owned());
                continue;
            }
            if !visited.insert(sha) {
                continue;
            }
            stack.push((sha, true));
            if let Some(node) = nodes.get(sha) {
                for child in node.children.iter().rev() {
                    if !visited.contains(child.as_str()) {
                        stack.push((child.as_str(), false));
                    }
                }
            }
        }
    }

    sorted
}

#[cfg(test)]
mod tests {
    use std::collections::HashMap;
    use crate::graph::types::CommitNode;
    use super::temporal_topological_sort;

    fn make_node(sha: &str, parents: &[&str], children: &[&str], date: i64) -> CommitNode {
        CommitNode {
            sha: sha.to_string(),
            parents: parents.iter().map(|s| s.to_string()).collect(),
            children: children.iter().map(|s| s.to_string()).collect(),
            author: "test".into(),
            author_email: "test@example.com".into(),
            message: "test".into(),
            committer_date: date,
            refs: vec![],
            is_head: false,
        }
    }

    #[test]
    fn single_commit() {
        let mut nodes = HashMap::new();
        nodes.insert("a".into(), make_node("a", &[], &[], 1000));
        let order = temporal_topological_sort(&nodes);
        assert_eq!(order, vec!["a"]);
    }

    #[test]
    fn parent_after_child() {
        let mut nodes = HashMap::new();
        nodes.insert("child".into(), make_node("child", &["parent"], &[], 2000));
        nodes.insert("parent".into(), make_node("parent", &[], &["child"], 1000));
        let order = temporal_topological_sort(&nodes);
        let child_idx = order.iter().position(|s| s == "child").unwrap();
        let parent_idx = order.iter().position(|s| s == "parent").unwrap();
        assert!(child_idx < parent_idx);
    }

    #[test]
    fn date_priority_when_topo_allows() {
        let mut nodes = HashMap::new();
        nodes.insert("old".into(), make_node("old", &[], &[], 1000));
        nodes.insert("new".into(), make_node("new", &[], &[], 2000));
        let order = temporal_topological_sort(&nodes);
        assert_eq!(order[0], "new");
        assert_eq!(order[1], "old");
    }

    #[test]
    fn topo_overrides_date() {
        let mut nodes = HashMap::new();
        nodes.insert("child".into(), make_node("child", &["parent"], &[], 2000));
        nodes.insert("parent".into(), make_node("parent", &[], &["child"], 1000));
        let order = temporal_topological_sort(&nodes);
        let child_idx = order.iter().position(|s| s == "child").unwrap();
        let parent_idx = order.iter().position(|s| s == "parent").unwrap();
        assert!(child_idx < parent_idx);
    }
}
