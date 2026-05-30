import { Undo2, Redo2, Download, Upload, GitBranch, Archive, ArrowUpFromLine, PanelLeft, Info, Sparkles, FolderOpen, GitMerge, GitPullRequest } from "lucide-react";
import Button from "./ui/Button";

interface Props {
  showLeft: boolean;
  showCommit: boolean;
  showAI: boolean;
  onToggleLeft: () => void;
  onToggleCommit: () => void;
  onToggleAI: () => void;
  onBranchClick: () => void;
  onOpenRepo: () => void;
  onPull: () => void;
  onPush: () => void;
  onStashClick: () => void;
  onStashPop: () => void;
  onRebaseClick: () => void;
  onCherryPick: () => void;
  stashCount: number;
}

export default function RepoToolbar({
  showLeft,
  showCommit,
  showAI,
  onToggleLeft,
  onToggleCommit,
  onToggleAI,
  onBranchClick,
  onOpenRepo,
  onPull,
  onPush,
  onStashClick,
  onStashPop,
  onRebaseClick,
  onCherryPick,
  stashCount,
}: Props) {
  return (
    <div className="flex h-10 items-center gap-0.5 border-b border-gb-border bg-gb-toolbar px-2">
      <Button variant="ghost" size="sm" icon={Undo2}>Undo</Button>
      <Button variant="ghost" size="sm" icon={Redo2}>Redo</Button>
      <Separator />
      <Button variant="ghost" size="sm" icon={Download} className="text-gb-accent" onClick={onPull}>Pull</Button>
      <Button variant="ghost" size="sm" icon={Upload} onClick={onPush}>Push</Button>
      <Separator />
      <Button variant="ghost" size="sm" icon={FolderOpen} onClick={onOpenRepo} title="Open Repository">Open</Button>
      <Button variant="ghost" size="sm" icon={GitBranch} onClick={onBranchClick}>Branch</Button>
      <Separator />
      <Button variant="ghost" size="sm" icon={Archive} onClick={onStashClick}>Stash</Button>
      <Button variant="ghost" size="sm" icon={ArrowUpFromLine} onClick={onStashPop} disabled={stashCount === 0} title="Pop most recent stash">Pop</Button>
      <Separator />
      <Button variant="ghost" size="sm" icon={GitMerge} onClick={onRebaseClick} title="Rebase">Rebase</Button>
      <Button variant="ghost" size="sm" icon={GitPullRequest} onClick={onCherryPick} title="Cherry-pick selected commit">Pick</Button>
      <div className="flex-1" />
      <Separator />
      <Button
        variant="ghost"
        size="sm"
        icon={PanelLeft}
        onClick={onToggleLeft}
        title="Toggle Left Panel"
        className={showLeft ? "text-gb-accent" : "text-gb-text-muted"}
      />
      <Button
        variant="ghost"
        size="sm"
        icon={Info}
        onClick={onToggleCommit}
        title="Toggle Commit Details"
        className={showCommit ? "text-gb-accent" : "text-gb-text-muted"}
      />
      <Button
        variant="ghost"
        size="sm"
        icon={Sparkles}
        onClick={onToggleAI}
        title="Toggle AI Panel"
        className={showAI ? "text-gb-accent" : "text-gb-text-muted"}
      />
    </div>
  );
}

function Separator() {
  return <div className="mx-1 h-6 w-px bg-gb-border" />;
}
