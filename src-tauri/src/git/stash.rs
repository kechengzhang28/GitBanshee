use crate::models::StashEntry;
use git2::Repository;

pub fn stash_save(repo: &mut Repository, message: Option<&str>) -> Result<String, String> {
    let msg = message.unwrap_or("GitBanshee stash");
    // Extract signature info first to avoid borrowing conflicts
    let (name, email) = {
        let sig = repo.signature().map_err(|e| format!("Signature: {e}"))?;
        (
            sig.name().unwrap_or("").to_string(),
            sig.email().unwrap_or("").to_string(),
        )
    };
    let sig = git2::Signature::now(&name, &email)
        .map_err(|e| format!("Create signature: {e}"))?;
    let oid = repo
        .stash_save(&sig, msg, Some(git2::StashFlags::DEFAULT))
        .map_err(|e| format!("Stash save failed: {e}"))?;
    Ok(oid.to_string())
}

pub fn stash_list(repo: &mut Repository) -> Result<Vec<StashEntry>, String> {
    let mut entries = Vec::new();
    repo.stash_foreach(|index: usize, message: &str, oid: &git2::Oid| -> bool {
        entries.push(StashEntry {
            index,
            message: message.trim().to_string(),
            oid: oid.to_string(),
        });
        true // continue iterating
    })
    .map_err(|e| format!("Stash list failed: {e}"))?;
    Ok(entries)
}

pub fn stash_pop(repo: &mut Repository, index: usize) -> Result<String, String> {
    let mut opts = git2::StashApplyOptions::default();
    repo.stash_pop(index, Some(&mut opts))
        .map_err(|e| format!("Stash pop failed: {e}"))?;
    Ok("Stash popped".into())
}

pub fn stash_apply(repo: &mut Repository, index: usize) -> Result<String, String> {
    let mut opts = git2::StashApplyOptions::default();
    repo.stash_apply(index, Some(&mut opts))
        .map_err(|e| format!("Stash apply failed: {e}"))?;
    Ok("Stash applied".into())
}

pub fn stash_drop(repo: &mut Repository, index: usize) -> Result<String, String> {
    repo.stash_drop(index)
        .map_err(|e| format!("Stash drop failed: {e}"))?;
    Ok("Stash dropped".into())
}
