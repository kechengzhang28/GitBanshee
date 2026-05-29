import { useEffect, useCallback } from "react";
import { createPortal } from "react-dom";

export type ContextMenuItem =
  | { label: string; onClick: () => void; shortcut?: string; danger?: boolean; separator?: false }
  | { separator: true };

interface Props {
  x: number;
  y: number;
  items: ContextMenuItem[];
  onClose: () => void;
}

export default function ContextMenu({ x, y, items, onClose }: Props) {
  const close = useCallback(() => onClose(), [onClose]);

  useEffect(() => {
    const handleClick = () => close();
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const timer = setTimeout(() => {
      window.addEventListener("click", handleClick);
      window.addEventListener("keydown", handleKey);
    }, 0);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("click", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [close]);

  const menuW = 220;
  const menuH = items.length * 28 + 4;
  const adjustedX = x + menuW > window.innerWidth ? x - menuW : x;
  const adjustedY = y + menuH > window.innerHeight ? y - menuH : y;

  return createPortal(
    <div
      className="fixed z-[9999] min-w-[200px] max-w-[260px] rounded-md border border-gb-border bg-gb-panel py-1 shadow-xl"
      style={{ left: adjustedX, top: adjustedY }}
      onClick={(e) => e.stopPropagation()}
    >
      {items.map((item, i) =>
        "separator" in item && item.separator ? (
          <div key={i} className="my-1 border-t border-gb-border" />
        ) : (
          <button
            key={i}
            onClick={() => { item.onClick(); close(); }}
            className={`flex w-full items-center justify-between px-3 py-1.5 text-xs
              hover:bg-gb-hover ${item.danger ? "text-gb-danger" : "text-gb-text"}`}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span className="ml-6 text-gb-text-muted">{item.shortcut}</span>
            )}
          </button>
        )
      )}
    </div>,
    document.body
  );
}
