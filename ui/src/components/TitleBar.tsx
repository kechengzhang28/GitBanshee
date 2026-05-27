import { useUiStore } from "../stores/uiStore";

export default function TitleBar() {
  const leftPanelVisible = useUiStore((s) => s.leftPanelVisible);
  const toggleLeftPanel = useUiStore((s) => s.toggleLeftPanel);

  return (
    <div className="flex h-10 items-center justify-between border-b border-gb-border bg-gb-toolbar px-4 select-none">
      <div className="flex items-center gap-3">
        <button
          onClick={toggleLeftPanel}
          className="rounded px-2 py-1 text-sm text-gb-text-sec hover:bg-gb-hover hover:text-gb-text"
        >
          {leftPanelVisible ? "\u25C0" : "\u25B6"}
        </button>
        <span className="text-sm font-semibold text-gb-accent">GitBanshee</span>
      </div>
    </div>
  );
}
