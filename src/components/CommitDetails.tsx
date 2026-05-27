import { useState, useEffect } from "react";
import { useRepoStore } from "../stores/repoStore";
import FileExplorer from "./FileExplorer";
import DiffViewer from "./DiffViewer";

export default function CommitDetails() {
  const [tab, setTab] = useState<"commit" | "diff">("commit");
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const commit = useRepoStore((s) => s.selectedCommit);
  const diff = useRepoStore((s) => s.diff);
  const loadDiff = useRepoStore((s) => s.loadDiff);

  useEffect(() => {
    if (commit && tab === "diff" && !diff) {
      loadDiff(commit.hash);
    }
  }, [commit, tab]);

  const selectedDiffFile = diff?.files.find((f) => f.path === selectedFile) || null;

  return (
    <div className="flex h-full flex-col bg-gb-panel">
      <div className="flex border-b border-gb-border bg-gb-toolbar">
        <button
          className={`px-3.5 py-2 text-xs font-medium ${
            tab === "commit"
              ? "border-b-2 border-gb-accent text-gb-accent"
              : "text-gb-text-muted hover:text-gb-text"
          }`}
          onClick={() => setTab("commit")}
        >
          Commit
        </button>
        <button
          className={`px-3.5 py-2 text-xs font-medium ${
            tab === "diff"
              ? "border-b-2 border-gb-accent text-gb-accent"
              : "text-gb-text-muted hover:text-gb-text"
          }`}
          onClick={() => setTab("diff")}
        >
          Diff
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {tab === "commit" ? (
          <CommitTab />
        ) : (
          <div className="flex h-full flex-col">
            <div className="shrink-0 border-b border-gb-border">
              <FileExplorer
                onSelect={setSelectedFile}
                selectedPath={selectedFile}
              />
            </div>
            <div className="flex-1 overflow-auto">
              <DiffViewer file={selectedDiffFile} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function CommitTab() {
  const commit = useRepoStore((s) => s.selectedCommit);

  if (!commit) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-xs text-gb-text-muted">Select a commit to view details</p>
      </div>
    );
  }

  return (
    <div className="p-3">
      <p className="mb-3 text-xs font-medium text-gb-accent">Commit Details</p>
      <div className="space-y-2 text-xs">
        <div>
          <span className="text-gb-text-muted">Hash</span>
          <p className="font-mono text-gb-text">{commit.short_hash}</p>
        </div>
        <div>
          <span className="text-gb-text-muted">Author</span>
          <p className="text-gb-text">{commit.author}</p>
        </div>
        <div>
          <span className="text-gb-text-muted">Date</span>
          <p className="text-gb-text">
            {new Date(commit.timestamp * 1000).toLocaleString()}
          </p>
        </div>
        <div>
          <span className="text-gb-text-muted">Message</span>
          <p className="whitespace-pre-wrap text-gb-text">{commit.message}</p>
        </div>
      </div>
    </div>
  );
}
