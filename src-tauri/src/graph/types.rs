use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct RenderData {
    pub commits: Vec<PositionedCommit>,
    pub branch_paths: Vec<BranchPath>,
    pub merge_curves: Vec<MergeCurve>,
    pub fork_curves: Vec<ForkCurve>,
}

#[derive(Debug, Clone, Serialize)]
pub struct PositionedCommit {
    pub sha: String,
    pub short_sha: String,
    pub col: usize,
    pub row: usize,
    pub color: String,
    pub dot_type: DotType,
    pub author: String,
    pub message: String,
    pub committer_date: i64,
    pub refs: Vec<RefInfo>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum DotType {
    Default,
    Head,
    Merge,
}

#[derive(Debug, Clone, Serialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RefKind {
    Branch,
    RemoteBranch,
    Tag,
    Head,
}

#[derive(Debug, Clone, Serialize)]
pub struct RefInfo {
    #[serde(rename = "type")]
    pub kind: RefKind,
    pub name: String,
    pub display_name: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct BranchPath {
    pub col: usize,
    pub start_row: usize,
    pub end_row: usize,
    pub color: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct MergeCurve {
    pub from_col: usize,
    pub from_row: usize,
    pub to_col: usize,
    pub to_row: usize,
    pub color: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ForkCurve {
    pub from_col: usize,
    pub from_row: usize,
    pub to_col: usize,
    pub to_row: usize,
    pub color: String,
}

// ── Internal types ─────────────────────────────────────────────────

pub(crate) struct CommitNode {
    pub sha: String,
    pub parents: Vec<String>,
    pub children: Vec<String>,
    pub author: String,
    pub message: String,
    pub committer_date: i64,
    pub refs: Vec<RefInfo>,
    pub is_head: bool,
}

#[derive(Debug)]
pub(crate) struct BranchSegment {
    pub start_row: usize,
    pub end_row: usize,
    pub end_sha: String,
    pub branch_order: usize,
}
