import { Undo2, Redo2, Download, Upload, GitBranch, Archive, ArrowUpFromLine } from "lucide-react";

export default function RepoToolbar() {
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
      <span className="text-xs text-gb-text-muted">v0.2</span>
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
