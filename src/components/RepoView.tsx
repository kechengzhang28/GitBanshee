import { useEffect, useState } from "react";
import { useRepoStore } from "../stores/repoStore";
import type { DiffFile } from "../types";
import TabBar from "./TabBar";
import RepoToolbar from "./RepoToolbar";
import LeftPanel from "./LeftPanel";
import CommitGraph from "./CommitGraph";
import CommitDetails from "./CommitDetails";
import AIPanel from "./ai/AIPanel";
import StatusBar from "./StatusBar";
import DiffViewer from "./DiffViewer";
import WorkingTree from "./WorkingTree";
import BranchDialog from "./BranchDialog";
import { ArrowLeft } from "lucide-react";

export default function RepoView() {
  const error = useRepoStore((s) => s.error);
  const path = useRepoStore((s) => s.path);
  const loadStatus = useRepoStore((s) => s.loadStatus);
  const [showLeft, setShowLeft] = useState(true);
  const [showCommit, setShowCommit] = useState(true);
  const [showAI, setShowAI] = useState(false);
  const [showTree, setShowTree] = useState(false);
  const [showBranchDialog, setShowBranchDialog] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [viewingFile, setViewingFile] = useState<DiffFile | null>(null);

  useEffect(() => {
    if (path) loadStatus();
  }, [path, loadStatus]);

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
        showTree={showTree}
        onToggleLeft={() => setShowLeft((v) => !v)}
        onToggleCommit={() => setShowCommit((v) => !v)}
        onToggleAI={() => setShowAI((v) => !v)}
        onToggleTree={() => setShowTree((v) => !v)}
        onBranchClick={() => setShowBranchDialog(true)}
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
              <div className="flex shrink-0 items-center gap-2 border-b border-gb-border bg-gb-toolbar px-3 py-1">
                <button
                  onClick={() => setViewingFile(null)}
                  className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-gb-text-muted hover:bg-gb-hover hover:text-gb-text"
                >
                  <ArrowLeft size={14} />
                  Back to graph
                </button>
                <span className="text-xs text-gb-text-sec">{viewingFile.path}</span>
              </div>
              <div className="flex-1 overflow-hidden">
                <DiffViewer file={viewingFile} />
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
        {(showCommit || showAI) && (
          <div className="flex shrink-0 border-l border-gb-border">
            {showCommit && (
              <div className="w-[340px]">
                <CommitDetails onViewFile={setViewingFile} />
              </div>
            )}
            {showAI && <AIPanel open={showAI} onToggle={() => setShowAI((v) => !v)} />}
          </div>
        )}
      </div>
      {showTree && (
        <div className="h-[180px] shrink-0">
          <WorkingTree />
        </div>
      )}
      <StatusBar zoomLevel={zoomLevel} />
      <BranchDialog
        open={showBranchDialog}
        onClose={() => setShowBranchDialog(false)}
      />
    </div>
  );
}
