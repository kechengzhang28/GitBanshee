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
  StatusEntry,
} from "../types";

export async function openRepo(path: string): Promise<OpenRepoResult> {
  return invoke<OpenRepoResult>("open_repo", { path });
}

export async function getCommits(
  path: string,
  offset: number,
  limit: number,
): Promise<{
  commits: PositionedCommit[];
  branch_paths: BranchPath[];
  merge_curves: MergeCurve[];
  fork_curves: ForkCurve[];
}> {
  return invoke<{
    commits: PositionedCommit[];
    branch_paths: BranchPath[];
    merge_curves: MergeCurve[];
    fork_curves: ForkCurve[];
  }>("get_commits", { path, offset, limit });
}

export async function getBranches(path: string): Promise<BranchInfo[]> {
  return invoke<BranchInfo[]>("get_branches", { path });
}

export async function getCommitDiff(
  path: string,
  hash: string,
): Promise<DiffContent> {
  return invoke<DiffContent>("get_commit_diff", { path, hash });
}

export async function getStatus(path: string): Promise<StatusEntry[]> {
  return invoke<StatusEntry[]>("get_status", { path });
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
