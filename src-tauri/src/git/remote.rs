use git2::Repository;

pub fn fetch(repo: &Repository, remote_name: &str) -> Result<String, String> {
    let mut remote = repo
        .find_remote(remote_name)
        .map_err(|e| format!("Remote '{}' not found: {}", remote_name, e))?;

    let refspec = format!("+refs/heads/*:refs/remotes/{remote_name}/*");

    let mut callbacks = git2::RemoteCallbacks::new();
    callbacks.credentials(|_url, _username, _allowed| git2::Cred::default());

    let mut fo = git2::FetchOptions::new();
    fo.remote_callbacks(callbacks);

    remote
        .fetch(&[&refspec], Some(&mut fo), None)
        .map_err(|e| format!("Fetch failed: {e}"))?;
    Ok("Fetch completed".into())
}

pub fn pull(repo: &Repository, remote_name: &str, branch: &str) -> Result<String, String> {
    fetch(repo, remote_name)?;

    let fetch_head = repo
        .find_reference("FETCH_HEAD")
        .map_err(|e| format!("FETCH_HEAD not found: {e}"))?;

    let annotated = repo
        .reference_to_annotated_commit(&fetch_head)
        .map_err(|e| format!("Resolve FETCH_HEAD: {e}"))?;

    let (analysis, _pref) = repo
        .merge_analysis(&[&annotated])
        .map_err(|e| format!("Merge analysis failed: {e}"))?;

    if analysis.is_up_to_date() {
        return Ok("Already up to date".into());
    }

    if analysis.is_fast_forward() {
        let refname = format!("refs/heads/{branch}");
        let mut r = repo
            .find_reference(&refname)
            .map_err(|e| format!("Branch '{}' not found: {}", branch, e))?;
        r.set_target(annotated.id(), &format!("fast-forward to {remote_name}/{branch}"))
            .map_err(|e| format!("Fast-forward failed: {e}"))?;
        repo.set_head(&refname)
            .map_err(|e| format!("Set HEAD failed: {e}"))?;
        repo.checkout_head(Some(git2::build::CheckoutBuilder::default().force()))
            .map_err(|e| format!("Checkout failed: {e}"))?;
        return Ok("Fast-forward complete".into());
    }

    // Normal merge
    repo.merge(&[&annotated], None, None)
        .map_err(|e| format!("Merge failed: {e}"))?;

    let has_conflicts = repo
        .index()
        .map_err(|e| format!("{}", e))?
        .has_conflicts();

    if has_conflicts {
        let conflicts = conflict_list(repo).map_err(|e| format!("{e}"))?;
        return Err(format!("Merge conflicts in:\n{conflicts}"));
    }

    // Auto-commit merge
    let tree_id = {
        let mut index = repo.index().map_err(|e| format!("{e}"))?;
        index.write_tree().map_err(|e| format!("{e}"))?
    };
    let tree = repo.find_tree(tree_id).map_err(|e| format!("{e}"))?;
    let sig = repo.signature().map_err(|e| format!("{e}"))?;
    let head = repo
        .head()
        .map_err(|e| format!("{e}"))?
        .peel_to_commit()
        .map_err(|e| format!("{e}"))?;
    let merged_commit = repo
        .find_commit(annotated.id())
        .map_err(|e| format!("{e}"))?;
    let parents = [&head, &merged_commit];

    repo.commit(
        Some("HEAD"),
        &sig,
        &sig,
        &format!("Merge {remote_name}/{branch}"),
        &tree,
        &parents,
    )
    .map_err(|e| format!("Merge commit failed: {e}"))?;

    Ok("Merge completed".into())
}

pub fn push(repo: &Repository, remote_name: &str) -> Result<String, String> {
    let mut remote = repo
        .find_remote(remote_name)
        .map_err(|e| format!("Remote '{}' not found: {}", remote_name, e))?;

    let head = repo.head().map_err(|e| format!("No HEAD: {e}"))?;
    let head_ref = head.name().ok_or("HEAD is detached")?;
    let name = head.shorthand().ok_or("Cannot resolve branch name")?;
    let refspec = format!("{head_ref}:refs/heads/{name}");

    let mut callbacks = git2::RemoteCallbacks::new();
    callbacks.credentials(|_url, _username, _allowed| git2::Cred::default());

    let mut po = git2::PushOptions::new();
    po.remote_callbacks(callbacks);

    remote
        .push(&[&refspec], Some(&mut po))
        .map_err(|e| format!("Push failed: {e}"))?;

    Ok("Push completed".into())
}

fn conflict_list(repo: &Repository) -> Result<String, git2::Error> {
    let conflicts = repo
        .index()?
        .conflicts()?
        .filter_map(|c| {
            let c = c.ok()?;
            let ancestor = c.ancestor?;
            Some(format!("  {}", String::from_utf8_lossy(&ancestor.path)))
        })
        .collect::<Vec<_>>();
    Ok(conflicts.join("\n"))
}
