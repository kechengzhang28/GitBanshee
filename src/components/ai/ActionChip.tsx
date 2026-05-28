import type { ElementType } from "react";

export interface ActionChipProps {
  icon?: ElementType;
  label: string;
  onClick?: () => void;
  active?: boolean;
}

export default function ActionChip({
  icon: Icon,
  label,
  onClick,
  active = false,
}: ActionChipProps) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "bg-gb-accent text-white"
          : "bg-gb-input text-gb-text-sec hover:bg-gb-hover hover:text-gb-text"
      }`}
    >
      {Icon && <Icon size={14} />}
      {label}
    </button>
  );
}
