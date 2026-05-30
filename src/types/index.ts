export interface PositionedCommit {
  sha: string;
  short_sha: string;
  col: number;
  row: number;
  color: string;
  dot_type: "default" | "head" | "merge";
  author: string;
  message: string;
  committer_date: number;
  refs: RefInfo[];
  parents: string[];
}

export interface RefInfo {
  type: "branch" | "remote_branch" | "tag" | "head";
  name: string;
  display_name: string;
}

export interface BranchPath {
  col: number;
  start_row: number;
  end_row: number;
  color: string;
}

export interface MergeCurve {
  from_col: number;
  from_row: number;
  to_col: number;
  to_row: number;
  color: string;
}

export interface ForkCurve {
  from_col: number;
  from_row: number;
  to_col: number;
  to_row: number;
  color: string;
}

export interface RenderData {
  commits: PositionedCommit[];
  branch_paths: BranchPath[];
  merge_curves: MergeCurve[];
  fork_curves: ForkCurve[];
}

export interface BranchInfo {
  name: string;
  is_head: boolean;
  target_commit: string | null;
  upstream: string | null;
  is_remote: boolean;
}

export interface TagInfo {
  name: string;
  display_name: string;
  target_commit: string;
  is_annotated: boolean;
}

export interface OpenRepoResult {
  path: string;
  branch_count: number;
  commit_count: number;
}

export interface DiffContent {
  files: DiffFile[];
}

export interface DiffFile {
  path: string;
  status: string;
  hunks: DiffHunk[];
  additions: number;
  deletions: number;
}

export interface DiffHunk {
  header: string;
  lines: DiffLine[];
}

export interface DiffLine {
  kind: string;
  content: string;
  old_lineno: number | null;
  new_lineno: number | null;
}

export interface StatusEntry {
  path: string;
  status: string;
}

export interface CommitResult {
  hash: string;
  short_hash: string;
}

export interface StashEntry {
  index: number;
  message: string;
  oid: string;
}
