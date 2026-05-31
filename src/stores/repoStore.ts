import { create, type StoreApi } from "zustand";
import type { BranchInfo, PositionedCommit, RenderData, StashEntry, StatusEntry, TagInfo } from "../types";
import * as ipc from "../utils/ipc";
import { toast } from "./toastStore";

const COMMIT_WINDOW_SIZE = 5000;

interface TabData {
  branches: BranchInfo[];
  commits: PositionedCommit[];
  renderData: RenderData | null;
  selectedCommit: PositionedCommit | null;
  commitCount: number;
  status: StatusEntry[];
  loadingStatus: boolean;
  scrollTarget: string | null;
  focusedBranch: string | null;
  stashes: StashEntry[];
  tags: TagInfo[];
  error: string | null;
  lastHeadSha: string | null;
}

function emptyTab(): TabData {
  return {
    branches: [],
    commits: [],
    renderData: null,
    selectedCommit: null,
    commitCount: 0,
    status: [],
    loadingStatus: false,
    scrollTarget: null,
    focusedBranch: null,
    stashes: [],
    tags: [],
    error: null,
    lastHeadSha: null,
  };
}

interface RepoState {
  path: string | null;
  tabs: Record<string, TabData>;
  openRepoPaths: string[];

  openRepo: (path: string) => Promise<void>;
  switchTab: (path: string) => void;
  closeTab: (path: string) => void;
  loadCommits: (offset: number, limit: number) => Promise<number>;
  loadBranches: () => Promise<void>;
  loadTags: () => Promise<void>;
  selectCommit: (commit: PositionedCommit | null) => void;
  focusCommit: (sha: string, branchName?: string) => void;

  loadStatus: () => Promise<void>;
  watcherRefresh: () => Promise<void>;
  focusRefresh: () => Promise<void>;
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

  loadStashes: () => Promise<void>;
  stashSave: (message?: string) => Promise<void>;
  stashPop: (index: number) => Promise<void>;
  stashApply: (index: number) => Promise<void>;
  stashDrop: (index: number) => Promise<void>;

  cherryPick: (hash: string) => Promise<void>;

  rebaseStart: (ontoBranch: string) => Promise<void>;
  rebaseContinue: () => Promise<void>;
  rebaseAbort: () => Promise<void>;
}

type SetState = StoreApi<RepoState>["setState"];
type GetState = StoreApi<RepoState>["getState"];

function updateTab(
  set: SetState,
  p: string,
  updates: Partial<TabData>,
): void {
  set((state) => {
    const tab = state.tabs[p];
    if (!tab) return {};
    return { tabs: { ...state.tabs, [p]: { ...tab, ...updates } } };
  });
}

async function invalidateAndReload(set: SetState, get: GetState): Promise<void> {
  const p = get().path;
  if (!p) return;
  updateTab(set, p, { commits: [] });
  await get().loadCommits(0, 500);
  await get().loadBranches();
  await get().loadStatus();
}

export const useRepoStore = create<RepoState>((set, get) => ({
  path: null,
  tabs: {},
  openRepoPaths: [],

  // ── Tab management ──────────────────────────────────────────

  openRepo: async (repoPath: string) => {
    const { tabs } = get();

    if (tabs[repoPath]) {
      set({ path: repoPath });
      return;
    }

    try {
      const result = await ipc.openRepo(repoPath);
      set((state) => ({
        path: result.path,
        tabs: {
          ...state.tabs,
          [result.path]: { ...emptyTab(), commitCount: result.commit_count },
        },
        openRepoPaths: state.openRepoPaths.includes(result.path)
          ? state.openRepoPaths
          : [...state.openRepoPaths, result.path],
      }));
    } catch (e) {
      const p = get().path;
      if (p) updateTab(set, p, { error: String(e) });
    }
  },

  switchTab: (repoPath: string) => {
    const { tabs } = get();
    if (!tabs[repoPath]) return;
    set((state) => {
      const tab = state.tabs[repoPath];
      if (!tab) return {};
      return { path: repoPath, tabs: { ...state.tabs, [repoPath]: { ...tab, error: null } } };
    });
  },

  closeTab: (repoPath: string) => {
    const { tabs, openRepoPaths, path } = get();
    const nextTabs = { ...tabs };
    delete nextTabs[repoPath];
    const nextPaths = openRepoPaths.filter((p) => p !== repoPath);

    if (nextPaths.length === 0) {
      set({ path: null, tabs: {}, openRepoPaths: [] });
      return;
    }

    let nextPath = path;
    if (path === repoPath) {
      const idx = openRepoPaths.indexOf(repoPath);
      nextPath = nextPaths[Math.min(idx, nextPaths.length - 1)];
    }

    set({ path: nextPath, tabs: nextTabs, openRepoPaths: nextPaths });
  },

  // ── Data loading ────────────────────────────────────────────

  loadCommits: async (offset: number, limit: number) => {
    const { path, tabs } = get();
    if (!path || !tabs[path]) return 0;
    try {
      const response = await ipc.getCommits(path, offset, limit);
      set((state) => {
        const tab = state.tabs[path];
        if (!tab) return {};
        let newCommits: typeof response.commits;
        if (offset === 0 || response.reload_all) {
          newCommits = response.commits;
        } else {
          newCommits = [...tab.commits, ...response.commits];
          if (newCommits.length > COMMIT_WINDOW_SIZE) {
            newCommits = newCommits.slice(newCommits.length - COMMIT_WINDOW_SIZE / 2);
          }
        }
        const headSha = newCommits.find((c) => c.dot_type !== "uncommitted")?.sha ?? null;
        return {
          tabs: {
            ...state.tabs,
            [path]: {
              ...tab,
              commits: newCommits,
              renderData: {
                commits: newCommits,
                branch_paths: response.branch_paths,
                merge_curves: response.merge_curves,
                fork_curves: response.fork_curves,
              },
              lastHeadSha: offset === 0 ? headSha : tab.lastHeadSha,
            },
          },
        };
      });
      return get().tabs[path]?.commits.length ?? 0;
    } catch (e) {
      toast("error", String(e));
      return 0;
    }
  },

  loadBranches: async () => {
    const { path, tabs } = get();
    if (!path || !tabs[path]) return;
    try {
      const branches = await ipc.getBranches(path);
      updateTab(set, path, { branches });
    } catch (e) {
      toast("error", String(e));
    }
  },

  loadTags: async () => {
    const { path, tabs } = get();
    if (!path || !tabs[path]) return;
    try {
      const tags = await ipc.getTags(path);
      updateTab(set, path, { tags });
    } catch (e) {
      toast("error", String(e));
    }
  },

  // ── Selection ───────────────────────────────────────────────

  selectCommit: (commit: PositionedCommit | null) => {
    const { path, tabs } = get();
    if (!path || !tabs[path]) return;
    updateTab(set, path, { selectedCommit: commit, focusedBranch: null });
  },

  focusCommit: (sha: string, branchName?: string) => {
    const { path, tabs } = get();
    if (!path || !tabs[path]) return;
    const tab = tabs[path];
    const found = sha ? tab.commits.find((c) => c.sha === sha || c.sha.startsWith(sha)) : undefined;
    updateTab(set, path, {
      focusedBranch: branchName ?? null,
      selectedCommit: found ?? null,
      scrollTarget: found?.sha ?? null,
    });
  },

  // ── Working tree ────────────────────────────────────────────

  loadStatus: async () => {
    const { path, tabs } = get();
    if (!path || !tabs[path]) return;
    updateTab(set, path, { loadingStatus: true });
    try {
      const status = await ipc.getStatus(path);
      updateTab(set, path, { status, error: null, loadingStatus: false });
    } catch (e) {
      toast("error", String(e));
      updateTab(set, path, { loadingStatus: false });
    }
  },

  focusRefresh: async () => {
    const { path } = get();
    if (!path) return;
    await get().loadStatus();
    await get().loadCommits(0, 500);
    await get().loadBranches();
  },

  watcherRefresh: async () => {
    const { path } = get();
    if (!path) return;
    await get().loadStatus();
  },

  stageFile: async (filePath: string) => {
    const { path } = get();
    if (!path) return;
    try { await ipc.stageFile(path, filePath); await get().loadStatus(); await get().loadCommits(0, 500); }
    catch (e) { toast("error", String(e)); }
  },
  unstageFile: async (filePath: string) => {
    const { path } = get();
    if (!path) return;
    try { await ipc.unstageFile(path, filePath); await get().loadStatus(); await get().loadCommits(0, 500); }
    catch (e) { toast("error", String(e)); }
  },
  stageAll: async () => {
    const { path } = get();
    if (!path) return;
    try { await ipc.stageAll(path); await get().loadStatus(); await get().loadCommits(0, 500); }
    catch (e) { toast("error", String(e)); }
  },

  // ── Mutations (invalidate current tab commits) ──────────────

  createCommit: async (message: string, amend: boolean) => {
    const { path } = get();
    if (!path) return;
    try {
      const result = await ipc.createCommit(path, message, amend);
      await get().loadStatus();
      await get().loadBranches();
      updateTab(set, path, { commits: [] });
      await get().loadCommits(0, 500);
      toast("success", `Commit ${result.short_hash} ${amend ? "amended" : "created"}`);
    } catch (e) { toast("error", String(e)); }
  },

  createBranch: async (name: string) => {
    const { path } = get();
    if (!path) return;
    try { await ipc.createBranch(path, name); await get().loadBranches(); toast("success", `Branch '${name}' created`); }
    catch (e) { toast("error", String(e)); }
  },

  deleteBranch: async (name: string) => {
    const { path } = get();
    if (!path) return;
    try { await ipc.deleteBranch(path, name); await get().loadBranches(); toast("info", `Branch '${name}' deleted`); }
    catch (e) { toast("error", String(e)); }
  },

  checkoutBranch: async (name: string) => {
    const { path } = get();
    if (!path) return;
    try {
      await ipc.checkoutBranch(path, name);
      await invalidateAndReload(set, get);
      toast("info", `Switched to '${name}'`);
    } catch (e) { toast("error", String(e)); }
  },

  checkoutCommit: async (hash: string) => {
    const { path } = get();
    if (!path) return;
    try {
      await ipc.checkoutCommit(path, hash);
      await invalidateAndReload(set, get);
      toast("info", `Detached HEAD at ${hash.slice(0, 7)}`);
    } catch (e) { toast("error", String(e)); }
  },

  fetchRemote: async () => {
    const { path } = get();
    if (!path) return;
    try { const msg = await ipc.fetchRemote(path, "origin"); toast("info", msg); }
    catch (e) { toast("error", String(e)); }
  },

  pull: async () => {
    const { path, tabs } = get();
    if (!path || !tabs[path]) return;
    const current = tabs[path].branches.find((b) => b.is_head)?.name ?? "main";
    try {
      const msg = await ipc.pull(path, "origin", current);
      toast("success", msg);
      await invalidateAndReload(set, get);
    } catch (e) { toast("error", String(e)); }
  },

  push: async () => {
    const { path } = get();
    if (!path) return;
    try { const msg = await ipc.push(path, "origin"); toast("success", msg); }
    catch (e) { toast("error", String(e)); }
  },

  // ── Stash ───────────────────────────────────────────────────

  loadStashes: async () => {
    const { path, tabs } = get();
    if (!path || !tabs[path]) return;
    try {
      const entries = await ipc.stashList(path);
      updateTab(set, path, { stashes: entries });
    } catch {
      updateTab(set, path, { stashes: [] });
    }
  },

  stashSave: async (message?: string) => {
    const { path } = get();
    if (!path) return;
    try { const msg = await ipc.stashSave(path, message); toast("success", msg || "Stash saved"); await get().loadStashes(); await get().loadStatus(); await get().loadCommits(0, 500); }
    catch (e) { toast("error", String(e)); }
  },
  stashPop: async (index: number) => {
    const { path } = get();
    if (!path) return;
    try {
      const msg = await ipc.stashPop(path, index);
      toast("success", msg);
      await get().loadStashes();
      await invalidateAndReload(set, get);
    } catch (e) { toast("error", String(e)); }
  },
  stashApply: async (index: number) => {
    const { path } = get();
    if (!path) return;
    try { const msg = await ipc.stashApply(path, index); toast("success", msg); await get().loadStatus(); await get().loadCommits(0, 500); }
    catch (e) { toast("error", String(e)); }
  },
  stashDrop: async (index: number) => {
    const { path } = get();
    if (!path) return;
    try { const msg = await ipc.stashDrop(path, index); toast("success", msg); await get().loadStashes(); }
    catch (e) { toast("error", String(e)); }
  },

  // ── Cherry-pick / Rebase ────────────────────────────────────

  cherryPick: async (hash: string) => {
    const { path } = get();
    if (!path) return;
    try {
      const msg = await ipc.cherryPick(path, hash);
      toast("success", msg);
      await invalidateAndReload(set, get);
    } catch (e) { toast("error", String(e)); }
  },

  rebaseStart: async (ontoBranch: string) => {
    const { path } = get();
    if (!path) return;
    try {
      const msg = await ipc.rebaseStart(path, ontoBranch);
      toast("success", msg);
      await invalidateAndReload(set, get);
    } catch (e) { toast("error", String(e)); }
  },

  rebaseContinue: async () => {
    const { path } = get();
    if (!path) return;
    try {
      const msg = await ipc.rebaseContinue(path);
      toast("success", msg);
      await invalidateAndReload(set, get);
    } catch (e) { toast("error", String(e)); }
  },

  rebaseAbort: async () => {
    const { path } = get();
    if (!path) return;
    try {
      const msg = await ipc.rebaseAbort(path);
      toast("info", msg);
      await invalidateAndReload(set, get);
    } catch (e) { toast("error", String(e)); }
  },
}));

// ── Per-tab selector helpers ─────────────────────────────────

function useTab<T>(sel: (t: TabData) => T, fallback: T): T {
  return useRepoStore((s) => {
    if (!s.path) return fallback;
    const tab = s.tabs[s.path];
    if (!tab) return fallback;
    return sel(tab);
  });
}

export const useBranches = () => useTab((t) => t.branches, [] as BranchInfo[]);
export const useCommits = () => useTab((t) => t.commits, [] as PositionedCommit[]);
export const useRenderData = () => useTab((t) => t.renderData, null as RenderData | null);
export const useSelectedCommit = () => useTab((t) => t.selectedCommit, null as PositionedCommit | null);
export const useCommitCount = () => useTab((t) => t.commitCount, 0);
export const useStatus = () => useTab((t) => t.status, [] as StatusEntry[]);
export const useLoadingStatus = () => useTab((t) => t.loadingStatus, false);
export const useScrollTarget = () => useTab((t) => t.scrollTarget, null as string | null);
export const useFocusedBranch = () => useTab((t) => t.focusedBranch, null as string | null);
export const useStashes = () => useTab((t) => t.stashes, [] as StashEntry[]);
export const useTags = () => useTab((t) => t.tags, [] as TagInfo[]);
export const useTabError = () => useTab((t) => t.error, null as string | null);
