use base64::Engine;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Cache for author avatar images, backed by in-memory state + disk files.
///
/// **In-memory layer:** `HashMap<email, (data_url_or_none, Instant)>`
/// Fast path for repeated lookups within TTL. Cleared on app restart.
///
/// **Disk layer:** `{cache_dir}/avatars/{md5(email)}.png` files + `index.json`
/// Survives app restarts. Index maps email-hash → unix timestamp of last resolution.
/// Whether the value is positive (avatar cached) or negative (no avatar)
/// is determined by whether the corresponding .png file exists on disk.
pub const AVATAR_CACHE_TTL: Duration = Duration::from_secs(24 * 60 * 60); // 24 hours

pub struct AvatarCache {
    /// In-memory cache: email → (data_url_or_none, cached_at)
    pub data: Mutex<HashMap<String, (Option<String>, Instant)>>,
    /// Root directory for persisted avatar cache files
    dir: PathBuf,
}

impl AvatarCache {
    pub fn new(dir: PathBuf) -> Self {
        let _ = std::fs::create_dir_all(&dir);
        Self {
            data: Mutex::new(HashMap::new()),
            dir,
        }
    }

    /// Build an md5 hash of the email for use as a filesystem-safe key.
    fn email_key(email: &str) -> String {
        format!("{:x}", md5::compute(email.as_bytes()))
    }

    fn image_path(&self, email: &str) -> PathBuf {
        self.dir.join(format!("{}.png", Self::email_key(email)))
    }

    fn index_path(&self) -> PathBuf {
        self.dir.join("index.json")
    }

    /// Try to load an avatar image from the disk cache.
    /// Returns Some(base64_data_url) on success, None if not cached or expired.
    pub fn load_from_disk(&self, email: &str) -> Option<String> {
        let key = Self::email_key(email);
        let index: HashMap<String, u64> = self.read_index().ok()?;
        let ts = index.get(&key)?;

        // Check TTL: has the cache entry expired?
        let age = Self::unix_now().saturating_sub(*ts);
        if age >= AVATAR_CACHE_TTL.as_secs() {
            return None; // expired — will re-fetch
        }

        let path = self.image_path(email);
        if !path.exists() {
            return None; // negative cache: no file means "no avatar"
        }

        let bytes = std::fs::read(&path).ok()?;
        let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
        Some(format!("data:image/png;base64,{}", b64))
    }

    /// Check if the disk cache has a valid "no avatar" negative entry for this email.
    pub fn has_no_avatar_disk(&self, email: &str) -> bool {
        let key = Self::email_key(email);
        if let Ok(index) = self.read_index() {
            if let Some(&ts) = index.get(&key) {
                let age = Self::unix_now().saturating_sub(ts);
                if age < AVATAR_CACHE_TTL.as_secs() && !self.image_path(email).exists() {
                    return true;
                }
            }
        }
        false
    }

    /// Download an avatar image from a URL, save it to disk, and return a base64 data URL.
    pub fn download_and_cache(&self, email: &str, url: &str) -> Result<String, String> {
        let response = reqwest::blocking::Client::new()
            .get(url)
            .header("User-Agent", "GitBanshee")
            .send()
            .map_err(|e| format!("Failed to download avatar: {}", e))?;

        if !response.status().is_success() {
            return Err(format!("Avatar download returned {}", response.status()));
        }

        let bytes = response
            .bytes()
            .map_err(|e| format!("Failed to read avatar bytes: {}", e))?;

        // Save to disk
        let path = self.image_path(email);
        std::fs::write(&path, &bytes)
            .map_err(|e| format!("Failed to write avatar file: {}", e))?;

        // Update index
        self.write_index_entry(email, Self::unix_now());

        let b64 = base64::engine::general_purpose::STANDARD.encode(&bytes);
        Ok(format!("data:image/png;base64,{}", b64))
    }

    /// Mark an email as "no avatar available" in the disk index.
    pub fn mark_no_avatar(&self, email: &str) {
        // Remove any stale image file from a previous positive cache
        let path = self.image_path(email);
        let _ = std::fs::remove_file(&path);
        // Record the current timestamp — absence of the .png file makes this a negative cache
        self.write_index_entry(email, Self::unix_now());
    }

    fn read_index(&self) -> Result<HashMap<String, u64>, String> {
        let path = self.index_path();
        if !path.exists() {
            return Ok(HashMap::new());
        }
        let content = std::fs::read_to_string(&path)
            .map_err(|e| format!("Failed to read avatar index: {}", e))?;
        serde_json::from_str(&content)
            .map_err(|e| format!("Failed to parse avatar index: {}", e))
    }

    fn write_index_entry(&self, email: &str, ts: u64) {
        let key = Self::email_key(email);
        let mut index = self.read_index().unwrap_or_default();
        index.insert(key, ts);
        if let Ok(json) = serde_json::to_string(&index) {
            let _ = std::fs::write(self.index_path(), json);
        }
    }

    fn unix_now() -> u64 {
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs()
    }
}
