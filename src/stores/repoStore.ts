import { create } from "zustand";
import type { BranchInfo, PositionedCommit, RenderData, StashEntry, StatusEntry } from "../types";
import * as ipc from "../utils/ipc";
import { toast } from "./toastStore";

const COMMIT_WINDOW_SIZE = 5000;

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
  stashes: StashEntry[];

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
  fetchRemote: () => Promise<void>;
  pull: () => Promise<void>;
  push: () => Promise<void>;

  // Stash
  loadStashes: () => Promise<void>;
  stashSave: (message?: string) => Promise<void>;
  stashPop: (index: number) => Promise<void>;
  stashApply: (index: number) => Promise<void>;
  stashDrop: (index: number) => Promise<void>;

  // Cherry-pick
  cherryPick: (hash: string) => Promise<void>;

  // Rebase
  rebaseStart: (ontoBranch: string) => Promise<void>;
  rebaseContinue: () => Promise<void>;
  rebaseAbort: () => Promise<void>;
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
  stashes: [],

  openRepo: async (path: string) => {
    try {
      const result = await ipc.openRepo(path);
      set({ path: result.path, commitCount: result.commit_count, error: null });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  loadCommits: async (offset: number, limit: number) => {
    const { path } = get();
    if (!path) return;
    try {
      const response = await ipc.getCommits(path, offset, limit);
      set((state) => {
        let newCommits: typeof response.commits;
        if (offset === 0) {
          newCommits = response.commits;
        } else {
          newCommits = [...state.commits, ...response.commits];
          // Sliding window: discard oldest half when above threshold
          if (newCommits.length > COMMIT_WINDOW_SIZE) {
            newCommits = newCommits.slice(newCommits.length - COMMIT_WINDOW_SIZE / 2);
          }
        }
        return {
          commits: newCommits,
          renderData: {
            commits: newCommits,
            branch_paths: response.branch_paths,
            merge_curves: response.merge_curves,
            fork_curves: response.fork_curves,
          },
        };
      });
    } catch (e) {
      toast("error", String(e));
    }
  },

  loadBranches: async () => {
    const { path } = get();
    if (!path) return;
    try {
      const branches = await ipc.getBranches(path);
      set({ branches });
    } catch (e) {
      toast("error", String(e));
    }
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
      stashes: [],
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
      toast("error", String(e));
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
      toast("error", String(e));
    }
  },

  unstageFile: async (filePath: string) => {
    const { path } = get();
    if (!path) return;
    try {
      await ipc.unstageFile(path, filePath);
      await get().loadStatus();
    } catch (e) {
      toast("error", String(e));
    }
  },

  stageAll: async () => {
    const { path } = get();
    if (!path) return;
    try {
      await ipc.stageAll(path);
      await get().loadStatus();
    } catch (e) {
      toast("error", String(e));
    }
  },

  createCommit: async (message: string, amend: boolean) => {
    const { path } = get();
    if (!path) return;
    try {
      const result = await ipc.createCommit(path, message, amend);
      await get().loadStatus();
      await get().loadBranches();
      set({ commits: [] });
      await get().loadCommits(0, 500);
      toast("success", `Commit ${result.short_hash} ${amend ? "amended" : "created"}`);
    } catch (e) {
      toast("error", String(e));
    }
  },

  createBranch: async (name: string) => {
    const { path } = get();
    if (!path) return;
    try {
      await ipc.createBranch(path, name);
      await get().loadBranches();
      toast("success", `Branch '${name}' created`);
    } catch (e) {
      toast("error", String(e));
    }
  },

  deleteBranch: async (name: string) => {
    const { path } = get();
    if (!path) return;
    try {
      await ipc.deleteBranch(path, name);
      await get().loadBranches();
      toast("info", `Branch '${name}' deleted`);
    } catch (e) {
      toast("error", String(e));
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
      toast("info", `Switched to '${name}'`);
    } catch (e) {
      toast("error", String(e));
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
      toast("info", `Detached HEAD at ${hash.slice(0, 7)}`);
    } catch (e) {
      toast("error", String(e));
    }
  },

  fetchRemote: async () => {
    const { path } = get();
    if (!path) return;
    try {
      const msg = await ipc.fetchRemote(path, "origin");
      toast("info", msg);
    } catch (e) {
      toast("error", String(e));
    }
  },

  pull: async () => {
    const { path, branches } = get();
    if (!path) return;
    const current = branches.find((b) => b.is_head)?.name ?? "main";
    try {
      const msg = await ipc.pull(path, "origin", current);
      toast("success", msg);
      set({ commits: [] });
      await get().loadCommits(0, 500);
      await get().loadBranches();
    } catch (e) {
      toast("error", String(e));
    }
  },

  push: async () => {
    const { path } = get();
    if (!path) return;
    try {
      const msg = await ipc.push(path, "origin");
      toast("success", msg);
    } catch (e) {
      toast("error", String(e));
    }
  },

  // ---- Stash ----

  loadStashes: async () => {
    const { path } = get();
    if (!path) return;
    try {
      const entries = await ipc.stashList(path);
      set({ stashes: entries });
    } catch (e) {
      // No stashes is not an error
      set({ stashes: [] });
    }
  },

  stashSave: async (message?: string) => {
    const { path } = get();
    if (!path) return;
    try {
      const msg = await ipc.stashSave(path, message);
      toast("success", msg || "Stash saved");
      await get().loadStashes();
      await get().loadStatus();
    } catch (e) {
      toast("error", String(e));
    }
  },

  stashPop: async (index: number) => {
    const { path } = get();
    if (!path) return;
    try {
      const msg = await ipc.stashPop(path, index);
      toast("success", msg);
      set({ commits: [] });
      await get().loadStashes();
      await get().loadStatus();
      await get().loadCommits(0, 500);
    } catch (e) {
      toast("error", String(e));
    }
  },

  stashApply: async (index: number) => {
    const { path } = get();
    if (!path) return;
    try {
      const msg = await ipc.stashApply(path, index);
      toast("success", msg);
      await get().loadStatus();
    } catch (e) {
      toast("error", String(e));
    }
  },

  stashDrop: async (index: number) => {
    const { path } = get();
    if (!path) return;
    try {
      const msg = await ipc.stashDrop(path, index);
      toast("success", msg);
      await get().loadStashes();
    } catch (e) {
      toast("error", String(e));
    }
  },

  // ---- Cherry-pick ----

  cherryPick: async (hash: string) => {
    const { path } = get();
    if (!path) return;
    try {
      const msg = await ipc.cherryPick(path, hash);
      toast("success", msg);
      set({ commits: [] });
      await get().loadCommits(0, 500);
      await get().loadBranches();
      await get().loadStatus();
    } catch (e) {
      toast("error", String(e));
    }
  },

  // ---- Rebase ----

  rebaseStart: async (ontoBranch: string) => {
    const { path } = get();
    if (!path) return;
    try {
      const msg = await ipc.rebaseStart(path, ontoBranch);
      toast("success", msg);
      set({ commits: [] });
      await get().loadCommits(0, 500);
      await get().loadBranches();
      await get().loadStatus();
    } catch (e) {
      toast("error", String(e));
    }
  },

  rebaseContinue: async () => {
    const { path } = get();
    if (!path) return;
    try {
      const msg = await ipc.rebaseContinue(path);
      toast("success", msg);
      set({ commits: [] });
      await get().loadCommits(0, 500);
      await get().loadBranches();
      await get().loadStatus();
    } catch (e) {
      toast("error", String(e));
    }
  },

  rebaseAbort: async () => {
    const { path } = get();
    if (!path) return;
    try {
      const msg = await ipc.rebaseAbort(path);
      toast("info", msg);
      set({ commits: [] });
      await get().loadCommits(0, 500);
      await get().loadBranches();
      await get().loadStatus();
    } catch (e) {
      toast("error", String(e));
    }
  },
}));
