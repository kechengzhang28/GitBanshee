import { Undo2, Redo2, Download, Upload, GitBranch, Archive, ArrowUpFromLine, PanelLeft, Info, Sparkles } from "lucide-react";
import IconButton from "./IconButton";

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
      <ToolbarButton Icon={Undo2} label="Undo" />
      <ToolbarButton Icon={Redo2} label="Redo" />
      <Separator />
      <ToolbarButton Icon={Download} label="Pull" accent />
      <ToolbarButton Icon={Upload} label="Push" />
      <Separator />
      <ToolbarButton Icon={GitBranch} label="Branch" />
      <Separator />
      <ToolbarButton Icon={Archive} label="Stash" />
      <ToolbarButton Icon={ArrowUpFromLine} label="Pop" />
      <div className="flex-1" />
      <Separator />
      <IconButton
        icon={PanelLeft}
        onClick={onToggleLeft}
        title="Toggle Left Panel"
        className={showLeft ? "text-gb-accent" : "text-gb-text-muted"}
      />
      <IconButton
        icon={Info}
        onClick={onToggleCommit}
        title="Toggle Commit Details"
        className={showCommit ? "text-gb-accent" : "text-gb-text-muted"}
      />
      <IconButton
        icon={Sparkles}
        onClick={onToggleAI}
        title="Toggle AI Panel"
        className={showAI ? "text-gb-accent" : "text-gb-text-muted"}
      />
    </div>
  );
}

function ToolbarButton({
  Icon,
  label,
  accent,
}: {
  Icon: React.ElementType;
  label: string;
  accent?: boolean;
}) {
  return (
    <button
      className={`flex h-8 items-center gap-1.5 rounded px-2 text-xs ${
        accent ? "text-gb-accent" : "text-gb-text-sec"
      } hover:bg-gb-hover hover:text-gb-text`}
    >
      <Icon size={14} />
      <span>{label}</span>
    </button>
  );
}

function Separator() {
  return <div className="mx-1 h-6 w-px bg-gb-border" />;
}
