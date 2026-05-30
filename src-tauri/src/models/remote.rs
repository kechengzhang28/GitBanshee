use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteInfo {
    /// Platform identifier, e.g. "github". None if unsupported.
    pub platform: Option<String>,
    /// Owner name extracted from the URL, e.g. "torvalds".
    pub owner: Option<String>,
    /// Repository name extracted from the URL, e.g. "linux".
    pub repo: Option<String>,
    /// Avatar image URL, e.g. "https://github.com/torvalds.png".
    pub avatar_url: Option<String>,
}
