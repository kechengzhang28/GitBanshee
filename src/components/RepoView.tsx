import { useRepoStore } from "../stores/repoStore";
import TabBar from "./TabBar";
import RepoToolbar from "./RepoToolbar";
import LeftPanel from "./LeftPanel";
import GraphCanvas from "./GraphCanvas";
import CommitDetails from "./CommitDetails";
import AIPanel from "./AIPanel";
import StatusBar from "./StatusBar";

export default function RepoView() {
  const error = useRepoStore((s) => s.error);

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
    <div className="flex h-full flex-col bg-gb-bg">
      <TabBar />
      <RepoToolbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="w-[240px] shrink-0 overflow-hidden">
          <LeftPanel />
        </div>
        <div className="flex-1 overflow-hidden">
          <GraphCanvas />
        </div>
        <div className="flex shrink-0 border-l border-gb-border">
          <div className="w-[340px]">
            <CommitDetails />
          </div>
          <AIPanel />
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
