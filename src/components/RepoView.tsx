import { useState } from "react";
import { useRepoStore } from "../stores/repoStore";
import TabBar from "./TabBar";
import RepoToolbar from "./RepoToolbar";
import LeftPanel from "./LeftPanel";
import CommitGraph from "./CommitGraph";
import CommitDetails from "./CommitDetails";
import AIPanel from "./ai/AIPanel";
import StatusBar from "./StatusBar";

export default function RepoView() {
  const error = useRepoStore((s) => s.error);
  const [showLeft, setShowLeft] = useState(true);
  const [showCommit, setShowCommit] = useState(true);
  const [showAI, setShowAI] = useState(false);

  if (error) {
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
      />
      <div className="flex flex-1 overflow-hidden">
        {showLeft && (
          <div className="w-[240px] shrink-0 overflow-hidden">
            <LeftPanel />
          </div>
        )}
        <div className="flex-1 overflow-hidden">
          <CommitGraph />
        </div>
        {(showCommit || showAI) && (
          <div className="flex shrink-0 border-l border-gb-border">
            {showCommit && (
              <div className="w-[340px]">
                <CommitDetails />
              </div>
            )}
            {showAI && <AIPanel open={showAI} onToggle={() => setShowAI((v) => !v)} />}
          </div>
        )}
      </div>
      <StatusBar />
    </div>
  );
}
