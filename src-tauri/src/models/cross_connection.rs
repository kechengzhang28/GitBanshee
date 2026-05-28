use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CrossConnection {
    /// The lane where the corner lives (also the lane of the vertical segment)
    pub corner_lane: usize,
    /// The lane to which the horizontal line extends
    pub horizontal_lane: usize,
    /// Row of the corner / horizontal segment
    pub row: usize,
    /// true = rightward (horizontal first, then arc down to vertical)
    /// false = leftward (vertical through arc, then horizontal)
    pub horizontal_first: bool,
}
