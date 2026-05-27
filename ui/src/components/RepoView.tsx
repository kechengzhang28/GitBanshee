import { useRepoStore } from "../stores/repoStore";
import RepoToolbar from "./RepoToolbar";
import GraphCanvas from "./GraphCanvas";
import CommitDetails from "./CommitDetails";
import StatusBar from "./StatusBar";

export default function RepoView() {
  const error = useRepoStore((s) => s.error);

  if (error) {
    return (
      <div className="flex h-full items-center justify-center bg-gb-bg">
        <div className="text-center">
          <p className="text-gb-danger text-lg font-medium">Failed to open repository</p>
          <p className="text-gb-text-muted mt-2 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-gb-bg">
      <RepoToolbar />
      <div className="flex flex-1 overflow-hidden">
        <div className="flex-1 overflow-hidden">
          <GraphCanvas />
        </div>
        <div className="w-[340px] shrink-0 overflow-hidden border-l border-gb-border">
          <CommitDetails />
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
