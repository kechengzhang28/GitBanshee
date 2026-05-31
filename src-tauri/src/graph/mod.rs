pub mod color;
#[allow(clippy::module_inception)]
pub mod graph;
pub mod layout;
pub mod path;
pub mod sort;
pub mod types;

pub use graph::CommitGraph;
pub use types::{
    BranchPath, DotType, ForkCurve, MergeCurve, PositionedCommit, RenderData,
};
