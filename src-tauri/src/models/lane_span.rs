use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LaneSpan {
    pub lane: usize,
    pub start_row: usize,
    pub end_row: usize,
}
