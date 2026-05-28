use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StatusEntry {
    pub path: String,
    pub status: String,
}
