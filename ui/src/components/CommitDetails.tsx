import { useRepoStore } from "../stores/repoStore";

export default function CommitDetails() {
  const commit = useRepoStore((s) => s.selectedCommit);

  if (!commit) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <p className="text-gb-text-muted text-sm">Select a commit to view details</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-auto p-4">
      <p className="mb-3 text-sm font-medium text-gb-accent">Commit Details</p>
      <div className="space-y-2 text-sm">
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
