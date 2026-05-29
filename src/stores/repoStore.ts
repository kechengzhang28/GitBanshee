import { create } from "zustand";
import type { BranchInfo, PositionedCommit, RenderData, StatusEntry } from "../types";
import * as ipc from "../utils/ipc";

interface RepoState {
  path: string | null;
  branches: BranchInfo[];
  commits: PositionedCommit[];
  renderData: RenderData | null;
  selectedCommit: PositionedCommit | null;
  commitCount: number;
  status: StatusEntry[];
  loadingStatus: boolean;
  error: string | null;
  scrollTarget: string | null;
  focusedBranch: string | null;

  openRepo: (path: string) => Promise<void>;
  loadCommits: (offset: number, limit: number) => Promise<void>;
  loadBranches: () => Promise<void>;
  selectCommit: (commit: PositionedCommit | null) => void;
  focusCommit: (sha: string, branchName?: string) => void;
  closeRepo: () => void;

  loadStatus: () => Promise<void>;
  stageFile: (filePath: string) => Promise<void>;
  unstageFile: (filePath: string) => Promise<void>;
  stageAll: () => Promise<void>;
  createCommit: (message: string, amend: boolean) => Promise<void>;
  createBranch: (name: string) => Promise<void>;
  deleteBranch: (name: string) => Promise<void>;
  checkoutBranch: (name: string) => Promise<void>;
  checkoutCommit: (hash: string) => Promise<void>;
}

export const useRepoStore = create<RepoState>((set, get) => ({
  path: null,
  branches: [],
  commits: [],
  renderData: null,
  selectedCommit: null,
  commitCount: 0,
  status: [],
  loadingStatus: false,
  error: null,
  scrollTarget: null,
  focusedBranch: null,

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
    const response = await ipc.getCommits(path, offset, limit);
    const newCommits = offset === 0 ? response.commits : [...existing, ...response.commits];
    set({
      commits: newCommits,
      renderData: {
        commits: newCommits,
        branch_paths: response.branch_paths,
        merge_curves: response.merge_curves,
        fork_curves: response.fork_curves,
      },
    });
  },

  loadBranches: async () => {
    const { path } = get();
    if (!path) return;
    const branches = await ipc.getBranches(path);
    set({ branches });
  },

  selectCommit: (commit: PositionedCommit | null) => {
    set({ selectedCommit: commit, focusedBranch: null });
  },

  focusCommit: (sha: string, branchName?: string) => {
    const { commits } = get();
    const found = sha ? commits.find((c) => c.sha === sha || c.sha.startsWith(sha)) : undefined;
    set({
      focusedBranch: branchName ?? null,
      selectedCommit: found ?? null,
      scrollTarget: found?.sha ?? null,
    });
  },

  closeRepo: () => {
    set({
      path: null,
      branches: [],
      commits: [],
      renderData: null,
      selectedCommit: null,
      commitCount: 0,
      scrollTarget: null,
      focusedBranch: null,
      status: [],
      error: null,
    });
  },

  loadStatus: async () => {
    const { path } = get();
    if (!path) return;
    set({ loadingStatus: true });
    try {
      const status = await ipc.getStatus(path);
      set({ status, error: null });
    } catch (e) {
      set({ error: String(e) });
    } finally {
      set({ loadingStatus: false });
    }
  },

  stageFile: async (filePath: string) => {
    const { path } = get();
    if (!path) return;
    try {
      await ipc.stageFile(path, filePath);
      await get().loadStatus();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  unstageFile: async (filePath: string) => {
    const { path } = get();
    if (!path) return;
    try {
      await ipc.unstageFile(path, filePath);
      await get().loadStatus();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  stageAll: async () => {
    const { path } = get();
    if (!path) return;
    try {
      await ipc.stageAll(path);
      await get().loadStatus();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  createCommit: async (message: string, amend: boolean) => {
    const { path } = get();
    if (!path) return;
    try {
      await ipc.createCommit(path, message, amend);
      await get().loadStatus();
      await get().loadBranches();
      set({ commits: [] });
      await get().loadCommits(0, 500);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  createBranch: async (name: string) => {
    const { path } = get();
    if (!path) return;
    try {
      await ipc.createBranch(path, name);
      await get().loadBranches();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  deleteBranch: async (name: string) => {
    const { path } = get();
    if (!path) return;
    try {
      await ipc.deleteBranch(path, name);
      await get().loadBranches();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  checkoutBranch: async (name: string) => {
    const { path } = get();
    if (!path) return;
    try {
      await ipc.checkoutBranch(path, name);
      set({ commits: [] });
      await get().loadCommits(0, 500);
      await get().loadBranches();
      await get().loadStatus();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  checkoutCommit: async (hash: string) => {
    const { path } = get();
    if (!path) return;
    try {
      await ipc.checkoutCommit(path, hash);
      set({ commits: [] });
      await get().loadCommits(0, 500);
      await get().loadBranches();
      await get().loadStatus();
    } catch (e) {
      set({ error: String(e) });
    }
  },
}));
