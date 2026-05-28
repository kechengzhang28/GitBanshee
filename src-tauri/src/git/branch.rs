use git2::Repository;

pub fn create_branch(repo: &Repository, name: &str) -> Result<(), git2::Error> {
    let head = repo.head()?.peel_to_commit()?;
    repo.branch(name, &head, false)?;
    Ok(())
}

pub fn delete_branch(repo: &Repository, name: &str) -> Result<(), git2::Error> {
    let mut branch = repo.find_branch(name, git2::BranchType::Local)?;
    branch.delete()?;
    Ok(())
}

pub fn checkout_branch(repo: &Repository, name: &str) -> Result<(), git2::Error> {
    let (obj, reference) = repo.revparse_ext(name)?;
    let mut opts = git2::build::CheckoutBuilder::new();
    opts.force();
    repo.checkout_tree(&obj, Some(&mut opts))?;
    match reference {
        Some(r) => repo.set_head(r.name().unwrap_or("")),
        None => repo.set_head_detached(obj.id()),
    }?;
    Ok(())
}
