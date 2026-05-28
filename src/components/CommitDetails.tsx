import { useEffect, useState } from "react";
import { useRepoStore } from "../stores/repoStore";
import { getCommitDiff } from "../utils/ipc";
import type { DiffContent, DiffFile } from "../types";
import PanelHeader from "./PanelHeader";
import FileExplorer from "./FileExplorer";

interface Props {
  onViewFile?: (file: DiffFile) => void;
}

export default function CommitDetails({ onViewFile }: Props) {
  const commit = useRepoStore((s) => s.selectedCommit);
  const path = useRepoStore((s) => s.path);
  const [diff, setDiff] = useState<DiffContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const hash = commit?.hash ?? null;

  useEffect(() => {
    if (!path || !hash) {
      setDiff(null);
      setSelectedFile(null);
      return;
    }
    setLoading(true);
    setError(null);
    getCommitDiff(path, hash)
      .then((d) => {
        setDiff(d);
        setSelectedFile(d.files.length > 0 ? d.files[0].path : null);
        if (onViewFile && d.files.length > 0) {
          onViewFile(d.files[0]);
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [path, hash]);

  const handleSelect = (filePath: string) => {
    setSelectedFile(filePath);
    const file = diff?.files.find((f) => f.path === filePath);
    if (file && onViewFile) onViewFile(file);
  };

  if (!commit) {
    return (
      <div className="flex h-full items-center justify-center bg-gb-panel p-4">
        <p className="text-xs text-gb-text-muted">Select a commit to view details</p>
      </div>
    );
  }

  const totalAdd = diff?.files.reduce((s, f) => s + f.additions, 0) ?? 0;
  const totalDel = diff?.files.reduce((s, f) => s + f.deletions, 0) ?? 0;

  return (
    <div className="flex h-full flex-col bg-gb-panel">
      <PanelHeader title="Commit Details" />
      <div className="shrink-0 space-y-1 border-b border-gb-border px-3 py-2 text-xs">
        <div>
          <span className="text-gb-text-muted">Hash</span>{" "}
          <span className="font-mono text-gb-text">{commit.short_hash}</span>
        </div>
        <div>
          <span className="text-gb-text-muted">Author</span>{" "}
          <span className="text-gb-text">{commit.author}</span>
        </div>
        <div>
          <span className="text-gb-text-muted">Date</span>{" "}
          <span className="text-gb-text">{new Date(commit.timestamp * 1000).toLocaleString()}</span>
        </div>
        <p className="whitespace-pre-wrap text-gb-text">{commit.message}</p>
      </div>

      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-gb-text-muted">Loading diff...</p>
        </div>
      )}
      {error && (
        <div className="flex flex-1 items-center justify-center px-3">
          <p className="text-xs text-gb-danger">{error}</p>
        </div>
      )}

      {!loading && !error && diff && diff.files.length > 0 && (
        <>
          <div className="flex shrink-0 items-center gap-2 border-b border-gb-border px-3 py-1 text-xs">
            <span className="text-gb-success font-mono">+{totalAdd}</span>
            <span className="text-gb-danger font-mono">-{totalDel}</span>
            <span className="text-gb-text-muted">{diff.files.length} files</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <FileExplorer
              files={diff.files}
              selectedFile={selectedFile}
              onSelect={handleSelect}
            />
          </div>
        </>
      )}

      {!loading && !error && diff && diff.files.length === 0 && (
        <div className="flex flex-1 items-center justify-center">
          <p className="text-xs text-gb-text-muted">No changes in this commit</p>
        </div>
      )}
    </div>
  );
}
