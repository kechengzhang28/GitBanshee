import { Undo2, Redo2, Download, Upload, GitBranch, Archive, ArrowUpFromLine, PanelLeft, Info, Sparkles } from "lucide-react";

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
      <ToggleButton Icon={PanelLeft} active={showLeft} onClick={onToggleLeft} title="Toggle Left Panel" />
      <ToggleButton Icon={Info} active={showCommit} onClick={onToggleCommit} title="Toggle Commit Details" />
      <ToggleButton Icon={Sparkles} active={showAI} onClick={onToggleAI} title="Toggle AI Panel" />
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

function ToggleButton({
  Icon,
  active,
  onClick,
  title,
}: {
  Icon: React.ElementType;
  active: boolean;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={`flex h-8 w-8 items-center justify-center rounded ${
        active ? "text-gb-accent" : "text-gb-text-muted"
      } hover:bg-gb-hover hover:text-gb-text`}
    >
      <Icon size={14} />
    </button>
  );
}

function Separator() {
  return <div className="mx-1 h-6 w-px bg-gb-border" />;
}
