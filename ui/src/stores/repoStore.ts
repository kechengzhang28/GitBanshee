import { create } from "zustand";
import type { BranchInfo, CommitNode } from "../types";
import * as ipc from "../utils/ipc";

interface RepoState {
  path: string | null;
  branches: BranchInfo[];
  commits: CommitNode[];
  selectedCommit: CommitNode | null;
  commitCount: number;
  error: string | null;

  openRepo: (path: string) => Promise<void>;
  loadCommits: (offset: number, limit: number) => Promise<void>;
  loadBranches: () => Promise<void>;
  selectCommit: (commit: CommitNode | null) => void;
  closeRepo: () => void;
}

export const useRepoStore = create<RepoState>((set, get) => ({
  path: null,
  branches: [],
  commits: [],
  selectedCommit: null,
  commitCount: 0,
  error: null,

  openRepo: async (path: string) => {
    try {
      const result = await ipc.openRepo(path);
      set({ path: result.path, commitCount: result.commit_count, error: null });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  loadCommits: async (offset: number, limit: number) => {
    const { path, commits: existing } = get();
    if (!path) return;
    const newCommits = await ipc.getCommits(path, offset, limit);
    set({ commits: offset === 0 ? newCommits : [...existing, ...newCommits] });
  },

  loadBranches: async () => {
    const { path } = get();
    if (!path) return;
    const branches = await ipc.getBranches(path);
    set({ branches });
  },

  selectCommit: (commit: CommitNode | null) => {
    set({ selectedCommit: commit });
  },

  closeRepo: () => {
    set({
      path: null,
      branches: [],
      commits: [],
      selectedCommit: null,
      commitCount: 0,
      error: null,
    });
  },
}));
