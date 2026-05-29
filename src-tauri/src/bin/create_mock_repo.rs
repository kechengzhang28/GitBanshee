use git2::{Oid, Repository, Signature};
use std::error::Error;
use std::fs;
use std::path::Path;

fn main() -> Result<(), Box<dyn Error>> {
    let path = Path::new("../mock-repo");
    if path.exists() {
        fs::remove_dir_all(path)?;
    }

    let repo = Repository::init(path)?;
    let sig = Signature::now("Test User", "test@example.com")?;

    // ── A: initial root ──
    let a = write_commit(&repo, &sig, "A: initial root commit", &[]);
    repo.reference("refs/heads/main", a, false, "main")?;
    set_head(&repo, "refs/heads/main");

    // ── B: on main ──
    let b = write_commit(&repo, &sig, "B: add README.md", &[a]);
    update_ref(&repo, "refs/heads/main", b);
    set_head(&repo, "refs/heads/main");
    obj_tag(&repo, "v0.1", b);

    // ── Feature branch: C, D (fork from B) ──
    repo.branch("feature", &repo.find_commit(b)?, false)?;
    let c = write_commit(&repo, &sig, "C: start feature work", &[b]);
    update_ref(&repo, "refs/heads/feature", c);
    let d = write_commit(&repo, &sig, "D: finish feature", &[c]);
    update_ref(&repo, "refs/heads/feature", d);

    // ── Main continues: E, F (from B) ──
    set_head(&repo, "refs/heads/main");
    let e = write_commit(&repo, &sig, "E: main line continues", &[b]);
    update_ref(&repo, "refs/heads/main", e);
    let f = write_commit(&repo, &sig, "F: add docs", &[e]);
    update_ref(&repo, "refs/heads/main", f);
    set_head(&repo, "refs/heads/main");

    // Annotated tag on F
    let f_obj = repo.find_object(f, None)?;
    repo.tag("v1.0", &f_obj, &sig, "release version 1.0", false)?;

    // ── Merge feature into main: G (parents: F, D) ──
    let g = write_commit(&repo, &sig, "G: merge feature into main", &[f, d]);
    update_ref(&repo, "refs/heads/main", g);
    set_head(&repo, "refs/heads/main");

    // ── Hotfix branch: H, I (fork from E) ──
    repo.branch("hotfix", &repo.find_commit(e)?, false)?;
    let h = write_commit(&repo, &sig, "H: hotfix bug #42", &[e]);
    update_ref(&repo, "refs/heads/hotfix", h);
    let i = write_commit(&repo, &sig, "I: hotfix done", &[h]);
    update_ref(&repo, "refs/heads/hotfix", i);

    // ── Merge hotfix into main: J (parents: G, I) ──
    set_head(&repo, "refs/heads/main");
    let j = write_commit(&repo, &sig, "J: merge hotfix into main", &[g, i]);
    update_ref(&repo, "refs/heads/main", j);
    set_head(&repo, "refs/heads/main");

    // ── Remote tracking ref ──
    repo.reference("refs/remotes/origin/main", a, false, "remote tracking")?;

    println!("Mock repo created at: {}", path.canonicalize()?.display());
    println!("  commits: 10 (A..J)");
    println!("  branches: main, feature, hotfix");
    println!("  tags: v0.1 (lightweight on B), v1.0 (annotated on F)");
    println!("  merges: G (merges feature), J (merges hotfix)");
    println!("  remote: refs/remotes/origin/main");
    Ok(())
}

// ── Low-level helpers ─────────────────────────────────────────────

fn write_commit(repo: &Repository, sig: &Signature, msg: &str, parents: &[Oid]) -> Oid {
    let tree = empty_tree(repo);
    let parent_commits: Vec<git2::Commit> = parents.iter().map(|p| repo.find_commit(*p).unwrap()).collect();
    let parent_refs: Vec<&git2::Commit> = parent_commits.iter().collect();
    let buf = repo.commit_create_buffer(sig, sig, msg, &tree, &parent_refs).unwrap();
    repo.odb().unwrap().write(git2::ObjectType::Commit, &buf).unwrap()
}

fn empty_tree(repo: &Repository) -> git2::Tree {
    let mut index = repo.index().unwrap();
    let oid = index.write_tree().unwrap();
    repo.find_tree(oid).unwrap()
}

fn update_ref(repo: &Repository, name: &str, oid: Oid) {
    repo.reference(name, oid, true, "").unwrap();
}

fn set_head(repo: &Repository, ref_name: &str) {
    repo.set_head(ref_name).unwrap();
    let obj = repo.revparse_single(ref_name).unwrap();
    repo.checkout_tree(&obj, None).unwrap();
}

fn obj_tag(repo: &Repository, name: &str, oid: Oid) {
    let obj = repo.find_object(oid, Some(git2::ObjectType::Commit)).unwrap();
    repo.tag_lightweight(name, &obj, false).unwrap();
}
