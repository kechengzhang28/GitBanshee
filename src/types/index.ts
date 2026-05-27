export interface CommitNode {
  hash: string;
  short_hash: string;
  message: string;
  author: string;
  email: string;
  timestamp: number;
  parents: string[];
  lane: number;
  row: number;
}

export interface BranchInfo {
  name: string;
  is_head: boolean;
  target_commit: string | null;
  upstream: string | null;
}

export interface OpenRepoResult {
  path: string;
  branch_count: number;
  commit_count: number;
}
