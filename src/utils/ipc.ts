import { invoke } from "@tauri-apps/api/core";
import type {
  BranchInfo,
  BranchPath,
  CommitResult,
  DiffContent,
  ForkCurve,
  MergeCurve,
  OpenRepoResult,
  PositionedCommit,
  RemoteInfo,
  StashEntry,
  StatusEntry,
  TagInfo,
} from "../types";

export async function openRepo(path: string): Promise<OpenRepoResult> {
  return invoke<OpenRepoResult>("open_repo", { path });
}

export async function getCommits(
  path: string,
  offset: number,
  limit: number,
  forceRefresh?: boolean,
): Promise<{
  commits: PositionedCommit[];
  branch_paths: BranchPath[];
  merge_curves: MergeCurve[];
  fork_curves: ForkCurve[];
  reload_all?: boolean;
}> {
  return invoke<{
    commits: PositionedCommit[];
    branch_paths: BranchPath[];
    merge_curves: MergeCurve[];
    fork_curves: ForkCurve[];
    reload_all?: boolean;
  }>("get_commits", { path, offset, limit, force_refresh: forceRefresh });
}

export async function getBranches(path: string): Promise<BranchInfo[]> {
  return invoke<BranchInfo[]>("get_branches", { path });
}

export async function getTags(path: string): Promise<TagInfo[]> {
  return invoke<TagInfo[]>("get_tags", { path });
}

export async function getCommitDiff(
  path: string,
  hash: string,
): Promise<DiffContent> {
  return invoke<DiffContent>("get_commit_diff", { path, hash });
}

export async function getRemoteInfo(path: string): Promise<RemoteInfo | null> {
  return invoke<RemoteInfo | null>("get_remote_info", { path });
}

export async function getAuthorAvatar(path: string, sha: string): Promise<string | null> {
  return invoke<string | null>("get_author_avatar", { path, sha });
}

export async function getStatus(path: string): Promise<StatusEntry[]> {
  return invoke<StatusEntry[]>("get_status", { path });
}

export interface HeadStatus {
  head_sha: string;
  has_uncommitted: boolean;
}

export async function getHeadStatus(path: string): Promise<HeadStatus> {
  return invoke<HeadStatus>("get_head_status", { path });
}

export async function watchRepo(path: string): Promise<void> {
  return invoke("watch_repo", { path });
}

export async function unwatchRepo(path: string): Promise<void> {
  return invoke("unwatch_repo", { path });
}

export async function stageFile(
  path: string,
  filePath: string,
): Promise<void> {
  return invoke("stage_file", { path, filePath });
}

export async function unstageFile(
  path: string,
  filePath: string,
): Promise<void> {
  return invoke("unstage_file", { path, filePath });
}

export async function stageAll(path: string): Promise<void> {
  return invoke("stage_all", { path });
}

export async function createCommit(
  path: string,
  message: string,
  amend: boolean,
): Promise<CommitResult> {
  return invoke<CommitResult>("create_commit", { path, message, amend });
}

export async function createBranch(
  path: string,
  name: string,
): Promise<void> {
  return invoke("create_branch", { path, name });
}

export async function deleteBranch(
  path: string,
  name: string,
): Promise<void> {
  return invoke("delete_branch", { path, name });
}

export async function checkoutBranch(
  path: string,
  name: string,
): Promise<void> {
  return invoke("checkout_branch", { path, name });
}

export async function checkoutCommit(
  path: string,
  hash: string,
): Promise<void> {
  return invoke("checkout_commit", { path, hash });
}

export async function fetchRemote(path: string, remoteName: string): Promise<string> {
  return invoke<string>("fetch_remote", { path, remoteName });
}

export async function pull(path: string, remoteName: string, branch: string): Promise<string> {
  return invoke<string>("pull", { path, remoteName, branch });
}

export async function push(path: string, remoteName: string): Promise<string> {
  return invoke<string>("push", { path, remoteName });
}

// ---- Stash ----

export async function stashList(path: string): Promise<StashEntry[]> {
  return invoke<StashEntry[]>("stash_list", { path });
}

export async function stashSave(path: string, message?: string): Promise<string> {
  return invoke<string>("stash_save", { path, message });
}

export async function stashPop(path: string, index: number): Promise<string> {
  return invoke<string>("stash_pop", { path, index });
}

export async function stashApply(path: string, index: number): Promise<string> {
  return invoke<string>("stash_apply", { path, index });
}

export async function stashDrop(path: string, index: number): Promise<string> {
  return invoke<string>("stash_drop", { path, index });
}

// ---- Cherry-pick ----

export async function cherryPick(path: string, commitHash: string): Promise<string> {
  return invoke<string>("cherry_pick", { path, commitHash });
}

// ---- Rebase ----

export async function rebaseStart(path: string, ontoBranch: string): Promise<string> {
  return invoke<string>("rebase_start", { path, ontoBranch });
}

export async function rebaseContinue(path: string): Promise<string> {
  return invoke<string>("rebase_continue", { path });
}

export async function rebaseAbort(path: string): Promise<string> {
  return invoke<string>("rebase_abort", { path });
}
