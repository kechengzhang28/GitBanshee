export default function RepoToolbar() {
  return (
    <div className="flex h-10 items-center gap-0.5 border-b border-gb-border bg-gb-toolbar px-2">
      <ToolbarButton icon="\u21A9" label="Undo" />
      <ToolbarButton icon="\u21AA" label="Redo" />
      <Separator />
      <ToolbarButton icon="\u2193" label="Pull" accent />
      <ToolbarButton icon="\u2191" label="Push" />
      <Separator />
      <ToolbarButton icon="\u2442" label="Branch" />
      <Separator />
      <ToolbarButton icon="\u2630" label="Stash" />
      <ToolbarButton icon="\u2913" label="Pop" />
      <div className="flex-1" />
      <span className="text-xs text-gb-text-muted">v0.2</span>
    </div>
  );
}

function ToolbarButton({
  icon,
  label,
  accent,
}: {
  icon: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <button
      className={`flex h-8 items-center gap-1.5 rounded px-2 text-xs ${
        accent ? "text-gb-accent" : "text-gb-text-sec"
      } hover:bg-gb-hover hover:text-gb-text`}
    >
      <span className="text-sm">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function Separator() {
  return <div className="mx-1 h-6 w-px bg-gb-border" />;
}
