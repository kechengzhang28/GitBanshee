import { useState } from "react";
import { PanelRightOpen, PanelRightClose } from "lucide-react";

export default function AIPanel() {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <div className="flex h-full flex-col items-center border-l border-gb-border bg-gb-panel">
        <button
          onClick={() => setOpen(true)}
          className="mt-2 flex h-5 w-5 items-center justify-center rounded text-xs text-gb-text-muted hover:bg-gb-hover"
          title="Open AI Panel"
        >
          <PanelRightOpen size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex h-full w-[200px] shrink-0 flex-col border-l border-gb-border bg-gb-panel">
      <div className="flex h-8 items-center gap-1.5 border-b border-gb-border px-2.5">
        <span className="text-xs font-semibold text-gb-warning">AI</span>
        <div className="flex-1" />
        <button
          onClick={() => setOpen(false)}
          className="flex h-5 w-5 items-center justify-center rounded text-xs text-gb-text-muted hover:bg-gb-hover"
          title="Close AI Panel"
        >
          <PanelRightClose size={14} />
        </button>
      </div>
      <div className="flex-1 p-2">
        <p className="text-xs text-gb-text-muted">AI features coming in v0.5</p>
      </div>
      <div className="flex gap-1 border-t border-gb-border px-2 py-1.5">
        <ActionChip label="Msg" />
        <ActionChip label="Review" />
        <ActionChip label="Explain" />
      </div>
    </div>
  );
}

function ActionChip({ label }: { label: string }) {
  return (
    <span className="cursor-pointer rounded bg-gb-input px-2 py-0.5 text-xs text-gb-text-sec hover:text-gb-text">
      {label}
    </span>
  );
}
