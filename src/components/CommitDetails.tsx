import { useEffect, useState } from "react";
import { useRepoStore, useSelectedCommit, useBranches } from "../stores/repoStore";
import { getCommitDiff } from "../utils/ipc";
import type { DiffContent, DiffFile } from "../types";
import PanelHeader from "./PanelHeader";
import FileExplorer from "./FileExplorer";
import DiffSkeleton from "./DiffSkeleton";
import Button from "./ui/Button";
import { GitCommitHorizontal, GitPullRequest } from "lucide-react";

interface Props {
  onViewFile?: (file: DiffFile) => void;
}

export default function CommitDetails({ onViewFile }: Props) {
  const commit = useSelectedCommit();
  const path = useRepoStore((s) => s.path);
  const checkoutCommit = useRepoStore((s) => s.checkoutCommit);
  const cherryPick = useRepoStore((s) => s.cherryPick);
  const branches = useBranches();
  const currentBranch = branches.find((b) => b.is_head);
  const [diff, setDiff] = useState<DiffContent | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  const hash = commit?.sha ?? null;

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
    <div className="flex h-full flex-col border-l border-gb-border bg-gb-panel">
      <PanelHeader title="Commit Details" />
      <div className="shrink-0 space-y-1 border-b border-gb-border bg-gb-panel px-3 py-2 text-xs">
        <div className="flex items-center justify-between">
          <span>
            <span className="text-gb-text-muted">Hash</span>{" "}
            <span className="font-mono text-gb-text">{commit.short_sha}</span>
          </span>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              icon={GitPullRequest}
              onClick={() => cherryPick(commit.sha)}
              title="Cherry-pick this commit"
            >
              Pick
            </Button>
            {!currentBranch && (
              <Button
                variant="ghost"
                size="sm"
                icon={GitCommitHorizontal}
                onClick={() => checkoutCommit(commit.sha)}
                title="Checkout this commit"
              >
                Checkout
              </Button>
            )}
          </div>
        </div>
        <div>
          <span className="text-gb-text-muted">Author</span>{" "}
          <span className="text-gb-text">{commit.author}</span>
        </div>
        <div>
          <span className="text-gb-text-muted">Date</span>{" "}
          <span className="text-gb-text">{new Date(commit.committer_date * 1000).toLocaleString()}</span>
        </div>
        <p className="whitespace-pre-wrap text-gb-text">{commit.message}</p>
      </div>

      {loading && <DiffSkeleton />}
      {error && (
        <div className="flex flex-1 items-center justify-center px-3">
          <p className="text-xs text-gb-danger">{error}</p>
        </div>
      )}

      {!loading && !error && diff && diff.files.length > 0 && (
        <>
          <div className="flex shrink-0 items-center gap-2 border-b border-gb-border bg-gb-panel px-3 py-1 text-xs">
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
