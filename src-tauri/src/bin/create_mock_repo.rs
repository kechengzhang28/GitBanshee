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
    let base = 1735689600_i64; // 2025-01-01 00:00:00 UTC
    const H: i64 = 3600;
    let mut t = 0_i64; // hour counter, increments per commit

    // ── Root commit ──
    let root = commit(&repo, &mut t, base, "A: initial commit", &[]);
    set_ref(&repo, "refs/heads/main", root);

    // ── B on main, fork point for all feature branches ──
    let b = commit(&repo, &mut t, base, "B: add README and project structure", &[root]);
    set_ref(&repo, "refs/heads/main", b);
    tag(&repo, "v0.1", b);

    // ── Fan-out: 9 feature branches all forked from B ──
    let branches: [&str; 9] = [
        "feat/auth",
        "feat/api",
        "feat/ui",
        "feat/db",
        "feat/cache",
        "feat/logging",
        "feat/tests",
        "feat/config",
        "feat/docs",
    ];

    // Each feature branch gets 1–3 commits
    let commits_per_branch = [2usize, 3, 1, 2, 3, 1, 2, 3, 1];
    let mut branch_tips: Vec<Oid> = Vec::new();

    for (i, name) in branches.iter().enumerate() {
        repo.branch(*name, &repo.find_commit(b)?, false)?;
        let mut tip = b;
        let count = commits_per_branch[i];
        for j in 0..count {
            let msg = format!("{}/{}: work on {}", name, j + 1, name);
            let c = commit(&repo, &mut t, base, &msg, &[tip]);
            set_ref(&repo, &format!("refs/heads/{}", name), c);
            tip = c;
        }
        branch_tips.push(tip);
    }

    // ── Main continues: C, D, E (all 10 lanes active in parallel) ──
    let c = commit(&repo, &mut t, base, "C: update main configuration", &[b]);
    set_ref(&repo, "refs/heads/main", c);

    let d = commit(&repo, &mut t, base, "D: add core utilities", &[c]);
    set_ref(&repo, "refs/heads/main", d);

    let e = commit(&repo, &mut t, base, "E: refactor shared interfaces", &[d]);
    set_ref(&repo, "refs/heads/main", e);

    // ── Merge batch 1: feat/auth + feat/api into main (8 lanes remain) ──
    let m1 = commit(&repo, &mut t, base,
        "M1: merge feat/auth and feat/api", &[e, branch_tips[0], branch_tips[1]]);
    set_ref(&repo, "refs/heads/main", m1);

    // ── Main continues ──
    let g = commit(&repo, &mut t, base, "G: integrate merged features", &[m1]);
    set_ref(&repo, "refs/heads/main", g);

    // ── Merge batch 2: feat/ui + feat/db + feat/cache (5 lanes remain) ──
    let m2 = commit(&repo, &mut t, base,
        "M2: merge feat/ui, feat/db, feat/cache", &[g, branch_tips[2], branch_tips[3], branch_tips[4]]);
    set_ref(&repo, "refs/heads/main", m2);
    tag(&repo, "v0.2-beta", m2);

    // ── Main continues ──
    let hh = commit(&repo, &mut t, base, "H: documentation updates", &[m2]);
    set_ref(&repo, "refs/heads/main", hh);

    // ── Merge batch 3: feat/logging + feat/tests + feat/config (2 lanes remain) ──
    let m3 = commit(&repo, &mut t, base,
        "M3: merge feat/logging, feat/tests, feat/config", &[hh, branch_tips[5], branch_tips[6], branch_tips[7]]);
    set_ref(&repo, "refs/heads/main", m3);

    // ── Main continues ──
    let i = commit(&repo, &mut t, base, "I: final integration preparation", &[m3]);
    set_ref(&repo, "refs/heads/main", i);

    // ── Merge batch 4: feat/docs (all merged, 1 lane = main) ──
    let m4 = commit(&repo, &mut t, base,
        "M4: merge feat/docs and finalize", &[i, branch_tips[8]]);
    set_ref(&repo, "refs/heads/main", m4);

    // ── Final commits on main ──
    let j = commit(&repo, &mut t, base, "J: release preparations", &[m4]);
    set_ref(&repo, "refs/heads/main", j);

    let k = commit(&repo, &mut t, base, "K: v1.0 release", &[j]);
    set_ref(&repo, "refs/heads/main", k);

    // ── Annotated tag ──
    let sig = Signature::new("Test User", "test@example.com", &Time::new(base + t * H, 0))?;
    let k_obj = repo.find_object(k, None)?;
    repo.tag("v1.0", &k_obj, &sig, "stable release v1.0", false)?;

    // ── Post-release branch: a hotfix fork ──
    repo.branch("hotfix/v1.0.1", &repo.find_commit(k)?, false)?;
    let hf1 = commit(&repo, &mut t, base, "HF-1: fix critical login bug", &[k]);
    set_ref(&repo, "refs/heads/hotfix/v1.0.1", hf1);
    let hf2 = commit(&repo, &mut t, base, "HF-2: hotfix verified", &[hf1]);
    set_ref(&repo, "refs/heads/hotfix/v1.0.1", hf2);

    // ── Merge hotfix back to main ──
    let l = commit(&repo, &mut t, base,
        "L: merge hotfix/v1.0.1 into main", &[k, hf2]);
    set_ref(&repo, "refs/heads/main", l);

    // ── Keep some feature branches unmerged for realism ──
    // feat/experimental stays on its own
    repo.branch("feat/experimental", &repo.find_commit(e)?, false)?;
    let ex1 = commit(&repo, &mut t, base, "EXP-1: prototype new engine", &[e]);
    set_ref(&repo, "refs/heads/feat/experimental", ex1);
    let ex2 = commit(&repo, &mut t, base, "EXP-2: engine benchmark results", &[ex1]);
    set_ref(&repo, "refs/heads/feat/experimental", ex2);

    // ── Remote tracking refs ──
    repo.reference("refs/remotes/origin/main", l, false, "remote tracking")?;
    repo.reference("refs/remotes/origin/HEAD", l, true, "remote HEAD")?;

    // ── Misc tags ──
    tag(&repo, "pre-release", m3);
    tag(&repo, "v0.3-rc", i);

    // ── Summary ──
    println!("Mock repo created at: {}", path.canonicalize()?.display());
    println!("  commits: {} total", t);
    println!("  branches: main, feat/auth, feat/api, feat/ui, feat/db, feat/cache, feat/logging, feat/tests, feat/config, feat/docs, feat/experimental, hotfix/v1.0.1");
    println!("  tags: v0.1, v0.2-beta, pre-release, v0.3-rc, v1.0 (annotated)");
    println!("  merges: M1 (2 branches), M2 (3 branches), M3 (3 branches), M4 (1 branch), L (hotfix)");
    println!("  remote: refs/remotes/origin/main, refs/remotes/origin/HEAD");
    println!("  max parallel lanes: 10 (main + 9 feature branches between C–E)");
    Ok(())
}

// ── Helpers ────────────────────────────────────────────────────────

fn commit(repo: &Repository, t: &mut i64, base: i64, msg: &str, parents: &[Oid]) -> Oid {
    let sig = Signature::new("Test User", "test@example.com", &Time::new(base + *t * 3600, 0)).unwrap();
    let tree = empty_tree(repo);
    let parent_commits: Vec<git2::Commit> = parents.iter()
        .map(|p| repo.find_commit(*p).unwrap())
        .collect();
    let parent_refs: Vec<&git2::Commit> = parent_commits.iter().collect();
    let buf = repo.commit_create_buffer(&sig, &sig, msg, &tree, &parent_refs).unwrap();
    *t += 1;
    repo.odb().unwrap().write(git2::ObjectType::Commit, &buf).unwrap()
}

fn empty_tree(repo: &Repository) -> git2::Tree {
    let mut index = repo.index().unwrap();
    let oid = index.write_tree().unwrap();
    repo.find_tree(oid).unwrap()
}

fn set_ref(repo: &Repository, name: &str, oid: Oid) {
    repo.reference(name, oid, true, "").unwrap();
    repo.set_head(name).unwrap();
    let obj = repo.revparse_single(name).unwrap();
    repo.checkout_tree(&obj, None).unwrap();
}

fn tag(repo: &Repository, name: &str, oid: Oid) {
    let obj = repo.find_object(oid, Some(git2::ObjectType::Commit)).unwrap();
    repo.tag_lightweight(name, &obj, false).unwrap();
}
