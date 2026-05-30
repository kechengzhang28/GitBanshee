import { ChevronDown, ChevronRight } from "lucide-react";

interface Props {
  label: string;
  count: number;
  open: boolean;
  onToggle: () => void;
}

export default function SectionHeader({ label, count, open, onToggle }: Props) {
  return (
    <div
      className="flex h-7 cursor-pointer items-center gap-1.5 bg-gb-panel px-3
        text-xs font-semibold tracking-wider text-gb-text-muted hover:text-gb-text"
      onClick={onToggle}
    >
      {open ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
      <span>{label}</span>
      <div className="mx-1 flex-1 border-t border-gb-border" />
      <span>{count}</span>
    </div>
  );
}
