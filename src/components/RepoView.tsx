import { useEffect, useState } from "react";
import { useRepoStore, useSelectedCommit, useStashes } from "../stores/repoStore";
import type { DiffFile } from "../types";
import TabBar from "./TabBar";
import RepoToolbar from "./RepoToolbar";
import LeftPanel from "./LeftPanel";
import CommitGraph from "./CommitGraph";
import CommitDetails from "./CommitDetails";
import AIPanel from "./ai/AIPanel";
import StatusBar from "./StatusBar";
import DiffViewer from "./DiffViewer";
import BranchDialog from "./BranchDialog";
import StashDialog from "./StashDialog";
import RebaseDialog from "./RebaseDialog";
import { ChevronLeft, WrapText } from "lucide-react";
import { open } from "@tauri-apps/plugin-dialog";
import { ROW_HEIGHT } from "./constants";

export default function RepoView() {
  const error = useRepoStore((s) => s.tabs[s.path ?? '']?.error ?? null);
  const path = useRepoStore((s) => s.path);
  const loadStatus = useRepoStore((s) => s.loadStatus);
  const pullRepo = useRepoStore((s) => s.pull);
  const pushRepo = useRepoStore((s) => s.push);
  const stashPop = useRepoStore((s) => s.stashPop);
  const cherryPick = useRepoStore((s) => s.cherryPick);
  const selectedCommit = useSelectedCommit();
  const stashCount = useStashes().length;
  const [showLeft, setShowLeft] = useState(true);
  const [showCommit, setShowCommit] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [showStashDialog, setShowStashDialog] = useState(false);
  const [showRebaseDialog, setShowRebaseDialog] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewingFile, setViewingFile] = useState<DiffFile | null>(null);
  const [wrapLines, setWrapLines] = useState(false);

  const handleOpenRepo = async () => {
    const dir = await open({ directory: true, multiple: false, title: "Select a Git repository" });
    if (dir && typeof dir === "string") {
      useRepoStore.getState().openRepo(dir);
    }
  };

  useEffect(() => {
    if (path) loadStatus();
  }, [path, loadStatus]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const store = useRepoStore.getState();

      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (mod && e.shiftKey) {
        if (e.key === "P" || e.key === "p") { e.preventDefault(); store.push(); }
        else if (e.key === "L" || e.key === "l") { e.preventDefault(); store.pull(); }
        else if (e.key === "S" || e.key === "s") { e.preventDefault(); store.stashSave(); }
      } else if (mod && !e.shiftKey) {
        if (e.key === "l" || e.key === "L") { e.preventDefault(); store.fetchRemote(); }
      } else if (!mod) {
        if (e.key === "j") scrollByRow(1);
        else if (e.key === "k") scrollByRow(-1);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (!path && error) {
    return (
      <div className="flex h-full items-center justify-center bg-gb-bg">
        <div className="text-center">
          <p className="text-lg font-medium text-gb-danger">Failed to open repository</p>
          <p className="mt-2 text-sm text-gb-text-muted">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden bg-gb-bg">
      <TabBar />
      <RepoToolbar
        showLeft={showLeft}
        showCommit={showCommit}
        showAI={showAI}
        onToggleLeft={() => setShowLeft((v) => !v)}
        onToggleCommit={() => setShowCommit((v) => !v)}
        onToggleAI={() => setShowAI((v) => !v)}
        onOpenRepo={handleOpenRepo}
        onBranchClick={() => setShowBranchDialog(true)}
        onPull={() => pullRepo()}
        onPush={() => pushRepo()}
        onStashClick={() => setShowStashDialog(true)}
        onStashPop={() => stashPop(0)}
        onRebaseClick={() => setShowRebaseDialog(true)}
        onCherryPick={() => {
          if (selectedCommit) cherryPick(selectedCommit.sha);
        }}
        stashCount={stashCount}
      />
      <div className="flex flex-1 overflow-hidden">
        {showLeft && (
          <div className="w-[240px] shrink-0 overflow-hidden">
            <LeftPanel />
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          {viewingFile ? (
            <div className="flex h-full flex-col bg-gb-bg">
              <div className="flex h-[28px] shrink-0 items-center gap-1 border-b border-gb-border bg-gb-panel px-3 text-xs font-semibold uppercase tracking-wider text-gb-text-sec">
                <button
                  onClick={() => setViewingFile(null)}
                  className="flex items-center justify-center rounded p-0.5 text-gb-text-sec hover:bg-gb-hover hover:text-gb-text"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="normal-case text-gb-text-sec">{viewingFile.path}</span>
                <div className="flex-1" />
                <button
                  onClick={() => setWrapLines((v) => !v)}
                  className={`flex items-center justify-center rounded p-0.5 hover:bg-gb-hover ${
                    wrapLines ? "text-gb-text" : "text-gb-text-sec"
                  } hover:text-gb-text`}
                  title="Toggle word wrap"
                >
                  <WrapText size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-hidden">
                <DiffViewer file={viewingFile} wrap={wrapLines} />
              </div>
            </div>
          ) : (
            <CommitGraph
              zoomLevel={zoomLevel}
              onZoomChange={setZoomLevel}
              onToggleDetail={() => setShowCommit((v) => !v)}
            />
          )}
        </div>
        {((showCommit && selectedCommit) || showAI) && (
          <div className="flex shrink-0">
            {showCommit && selectedCommit && (
              <div className="w-[340px]">
                <CommitDetails onViewFile={setViewingFile} />
              </div>
            )}
            {showAI && <AIPanel open={showAI} onToggle={() => setShowAI((v) => !v)} />}
          </div>
        )}
      </div>
      <StatusBar zoomLevel={zoomLevel} />
      <BranchDialog
        open={showBranchDialog}
        onClose={() => setShowBranchDialog(false)}
      />
      <StashDialog
        open={showStashDialog}
        onClose={() => setShowStashDialog(false)}
      />
      <RebaseDialog
        open={showRebaseDialog}
        onClose={() => setShowRebaseDialog(false)}
      />
    </div>
  );
}

function scrollByRow(delta: number) {
  const el = document.querySelector<HTMLDivElement>(".overflow-auto");
  if (el) el.scrollTop += delta * ROW_HEIGHT;
}
