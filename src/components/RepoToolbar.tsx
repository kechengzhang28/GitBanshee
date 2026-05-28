import { Undo2, Redo2, Download, Upload, GitBranch, Archive, ArrowUpFromLine, PanelLeft, Info, Sparkles } from "lucide-react";
import Button from "./ui/Button";

interface Props {
  showLeft: boolean;
  showCommit: boolean;
  showAI: boolean;
  onToggleLeft: () => void;
  onToggleCommit: () => void;
  onToggleAI: () => void;
}

export default function RepoToolbar({ showLeft, showCommit, showAI, onToggleLeft, onToggleCommit, onToggleAI }: Props) {
  return (
    <div className="flex h-10 items-center gap-0.5 border-b border-gb-border bg-gb-toolbar px-2">
      <Button variant="ghost" size="sm" icon={Undo2}>Undo</Button>
      <Button variant="ghost" size="sm" icon={Redo2}>Redo</Button>
      <Separator />
      <Button variant="ghost" size="sm" icon={Download} className="text-gb-accent">Pull</Button>
      <Button variant="ghost" size="sm" icon={Upload}>Push</Button>
      <Separator />
      <Button variant="ghost" size="sm" icon={GitBranch}>Branch</Button>
      <Separator />
      <Button variant="ghost" size="sm" icon={Archive}>Stash</Button>
      <Button variant="ghost" size="sm" icon={ArrowUpFromLine}>Pop</Button>
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
