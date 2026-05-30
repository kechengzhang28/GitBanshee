use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TagInfo {
    pub name: String,
    pub display_name: String,
    pub target_commit: String,
    pub is_annotated: bool,
}
