import { invoke } from "@tauri-apps/api/core";
import type { BranchInfo, CommitNode, OpenRepoResult } from "../types";

export async function openRepo(path: string): Promise<OpenRepoResult> {
  return invoke<OpenRepoResult>("open_repo", { path });
}

export async function getCommits(
  path: string,
  offset: number,
  limit: number,
): Promise<CommitNode[]> {
  return invoke<CommitNode[]>("get_commits", { path, offset, limit });
}

export async function getBranches(path: string): Promise<BranchInfo[]> {
  return invoke<BranchInfo[]>("get_branches", { path });
}
