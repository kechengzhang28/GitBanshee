use git2::{ObjectType, Repository, Signature};
use std::error::Error;
use std::path::Path;

fn main() -> Result<(), Box<dyn Error>> {
    let path = Path::new("../mock-repo");
    if path.exists() {
        std::fs::remove_dir_all(path)?;
    }

    let repo = Repository::init(path)?;
    let sig = Signature::now("Test User", "test@example.com")?;

    // ── Main branch ──────────────────────────────────────────────

    let a = empty(&repo, &sig, "A: initial root commit");
    let b = child(&repo, &sig, "B: add README.md", &a);

    // Lightweight tag on B
    obj_tag(&repo, "v0.1", &b);

    // ── Feature branch (fork from B) ────────────────────────────
    make_branch(&repo, "feature", &b);
    let _c = on_branch(&repo, &sig, "C: start feature work", "refs/heads/feature");
    let d = on_branch(&repo, &sig, "D: finish feature", "refs/heads/feature");

    // ── Main continues ──────────────────────────────────────────
    checkout(&repo, "refs/heads/main");
    let e = child_obj(&repo, &sig, "E: main line continues", &b);
    let f = child_obj(&repo, &sig, "F: add docs", &e);

    // Annotated tag on F
    let f_obj = repo.find_object(f, None)?;
    repo.tag("v1.0", &f_obj, &sig, "release version 1.0", false)?;

    // ── Merge feature into main ─────────────────────────────────
    let g = merge(
        &repo,
        &sig,
        "G: merge feature into main",
        &f,
        &d,
    );

    // ── Hotfix branch (fork from E) ─────────────────────────────
    make_branch(&repo, "hotfix", &e);
    let _h = on_branch(&repo, &sig, "H: hotfix bug #42", "refs/heads/hotfix");
    let i = on_branch(&repo, &sig, "I: hotfix done", "refs/heads/hotfix");

    // ── Merge hotfix into main ──────────────────────────────────
    checkout(&repo, "refs/heads/main");
    let _j = merge(
        &repo,
        &sig,
        "J: merge hotfix into main",
        &g,
        &i,
    );

    // ── Remote tracking ref ─────────────────────────────────────
    repo.reference("refs/remotes/origin/main", a, false, "remote tracking")?;

    println!("Mock repo created at: {}", path.canonicalize()?.display());
    println!("  commits: 10 (A..J)");
    println!("  branches: main, feature, hotfix");
    println!("  tags: v0.1 (lightweight on B), v1.0 (annotated on F)");
    println!("  merges: G (merges feature), J (merges hotfix)");
    println!("  remote: refs/remotes/origin/main");
    Ok(())
}

// ── Helpers ─────────────────────────────────────────────────────

fn empty(repo: &Repository, sig: &Signature, msg: &str) -> git2::Oid {
    let mut index = repo.index().unwrap();
    let tree_oid = index.write_tree().unwrap();
    let tree = repo.find_tree(tree_oid).unwrap();
    repo.commit(Some("refs/heads/main"), sig, sig, msg, &tree, &[])
        .unwrap()
}

fn child(repo: &Repository, sig: &Signature, msg: &str, parent: &git2::Oid) -> git2::Oid {
    child_obj(repo, sig, msg, parent)
}

fn child_obj(repo: &Repository, sig: &Signature, msg: &str, parent: &git2::Oid) -> git2::Oid {
    let parent_commit = repo.find_commit(*parent).unwrap();
    let parent_tree = parent_commit.tree().unwrap();
    let mut b = repo.treebuilder(Some(&parent_tree)).unwrap();
    let file_oid = repo.blob(b"mock content").unwrap();
    b.insert(format!("file_{}.txt", msg.len()), file_oid, 0o100644)
        .unwrap();
    let tree_oid = b.write().unwrap();
    let tree = repo.find_tree(tree_oid).unwrap();
    repo.commit(
        Some("HEAD"),
        sig,
        sig,
        msg,
        &tree,
        &[&parent_commit],
    )
    .unwrap()
}

fn make_branch(repo: &Repository, name: &str, from: &git2::Oid) {
    let commit = repo.find_commit(*from).unwrap();
    repo.branch(name, &commit, false).unwrap();
}

fn on_branch(
    repo: &Repository,
    sig: &Signature,
    msg: &str,
    ref_name: &str,
) -> git2::Oid {
    checkout(repo, ref_name);
    let head = repo.head().unwrap().peel_to_commit().unwrap();
    let tree = head.tree().unwrap();
    let mut b = repo.treebuilder(Some(&tree)).unwrap();
    let file_oid = repo.blob(b"mock content").unwrap();
    b.insert(format!("file_{}.txt", msg.len()), file_oid, 0o100644)
        .unwrap();
    let tree_oid = b.write().unwrap();
    let tree = repo.find_tree(tree_oid).unwrap();
    repo.commit(Some(ref_name), sig, sig, msg, &tree, &[&head])
        .unwrap()
}

fn checkout(repo: &Repository, ref_name: &str) {
    let (obj, _) = repo.revparse_ext(ref_name).unwrap();
    repo.checkout_tree(&obj, None).unwrap();
    repo.set_head(ref_name).unwrap();
}

fn obj_tag(repo: &Repository, name: &str, oid: &git2::Oid) {
    let obj = repo.find_object(*oid, Some(ObjectType::Commit)).unwrap();
    repo.tag_lightweight(name, &obj, false).unwrap();
}

fn merge(
    repo: &Repository,
    sig: &Signature,
    msg: &str,
    parent1: &git2::Oid,
    parent2: &git2::Oid,
) -> git2::Oid {
    let p1 = repo.find_commit(*parent1).unwrap();
    let p2 = repo.find_commit(*parent2).unwrap();
    let tree = p1.tree().unwrap();

    // Write commit directly to ODB, bypassing HEAD check
    let oid = repo.commit_create_buffer(sig, sig, msg, &tree, &[&p1, &p2]).unwrap();
    let oid = repo
        .odb()
        .unwrap()
        .write(git2::ObjectType::Commit, &oid)
        .unwrap();

    // Update main branch ref
    repo.reference("refs/heads/main", oid, true, "merge").unwrap();
    repo.set_head("refs/heads/main").unwrap();
    checkout(repo, "refs/heads/main");

    oid
}
