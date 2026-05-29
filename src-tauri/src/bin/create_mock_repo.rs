use git2::{Oid, Repository, Signature, Time};
use std::error::Error;
use std::fs;
use std::path::Path;

fn main() -> Result<(), Box<dyn Error>> {
    let path = Path::new("../mock-repo");
    if path.exists() {
        fs::remove_dir_all(path)?;
    }

    let repo = Repository::init(path)?;
    let base = 1735689600; // 2025-01-01 00:00:00 UTC
    let h = 3600_i64;

    // ── A: initial root (base) ──
    let a = write_commit(&repo, base, "A: initial root commit", &[]);
    repo.reference("refs/heads/main", a, false, "main")?;
    set_head(&repo, "refs/heads/main");

    // ── B: on main (base + 1h) ──
    let b = write_commit(&repo, base + h, "B: add README.md", &[a]);
    update_ref(&repo, "refs/heads/main", b);
    set_head(&repo, "refs/heads/main");
    obj_tag(&repo, "v0.1", b);

    // ── Feature branch: C (base+2h), D (base+3h) ──
    repo.branch("feature", &repo.find_commit(b)?, false)?;
    let c = write_commit(&repo, base + h * 2, "C: start feature work", &[b]);
    update_ref(&repo, "refs/heads/feature", c);
    let d = write_commit(&repo, base + h * 3, "D: finish feature", &[c]);
    update_ref(&repo, "refs/heads/feature", d);

    // ── Main continues: E (base+4h), F (base+5h) ──
    set_head(&repo, "refs/heads/main");
    let e = write_commit(&repo, base + h * 4, "E: main line continues", &[b]);
    update_ref(&repo, "refs/heads/main", e);
    let f = write_commit(&repo, base + h * 5, "F: add docs", &[e]);
    update_ref(&repo, "refs/heads/main", f);
    set_head(&repo, "refs/heads/main");

    // Annotated tag on F
    let sig = Signature::new("Test User", "test@example.com", &Time::new(base + h * 5, 0))?;
    let f_obj = repo.find_object(f, None)?;
    repo.tag("v1.0", &f_obj, &sig, "release version 1.0", false)?;

    // ── Merge feature into main: G (base+6h, parents: F, D) ──
    let g = write_commit(&repo, base + h * 6, "G: merge feature into main", &[f, d]);
    update_ref(&repo, "refs/heads/main", g);
    set_head(&repo, "refs/heads/main");

    // ── Hotfix branch: H (base+7h), I (base+8h), fork from E ──
    repo.branch("hotfix", &repo.find_commit(e)?, false)?;
    let hh = write_commit(&repo, base + h * 7, "H: hotfix bug #42", &[e]);
    update_ref(&repo, "refs/heads/hotfix", hh);
    let i = write_commit(&repo, base + h * 8, "I: hotfix done", &[hh]);
    update_ref(&repo, "refs/heads/hotfix", i);

    // ── Merge hotfix into main: J (base+9h, parents: G, I) ──
    set_head(&repo, "refs/heads/main");
    let j = write_commit(&repo, base + h * 9, "J: merge hotfix into main", &[g, i]);
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

fn write_commit(repo: &Repository, time: i64, msg: &str, parents: &[Oid]) -> Oid {
    let sig = Signature::new("Test User", "test@example.com", &Time::new(time, 0)).unwrap();
    let tree = empty_tree(repo);
    let parent_commits: Vec<git2::Commit> = parents.iter().map(|p| repo.find_commit(*p).unwrap()).collect();
    let parent_refs: Vec<&git2::Commit> = parent_commits.iter().collect();
    let buf = repo.commit_create_buffer(&sig, &sig, msg, &tree, &parent_refs).unwrap();
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
