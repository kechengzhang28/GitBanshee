import PanelHeader from "./PanelHeader";
import IconButton from "./IconButton";
import { PanelRightClose } from "lucide-react";

interface Props {
  open: boolean;
  onToggle: () => void;
}

export default function AIPanel({ open, onToggle }: Props) {
  if (!open) return null;

  return (
    <div className="flex h-full w-[200px] shrink-0 flex-col border-l border-gb-border bg-gb-panel">
      <PanelHeader
        title="AI"
        actions={<IconButton icon={PanelRightClose} size="sm" onClick={onToggle} title="Close AI Panel" />}
      />
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
