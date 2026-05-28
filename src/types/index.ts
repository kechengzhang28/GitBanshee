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

export interface GraphPoint {
  lane: number;
  row: number;
}

export interface PathData {
  points: GraphPoint[];
  color: string;
}

export interface LinkData {
  start: GraphPoint;
  control: GraphPoint;
  end: GraphPoint;
  color: string;
}

export interface GraphData {
  paths: PathData[];
  links: LinkData[];
}

export interface BranchInfo {
  name: string;
  is_head: boolean;
  target_commit: string | null;
  upstream: string | null;
  is_remote: boolean;
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
