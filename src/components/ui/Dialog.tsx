import { useEffect } from "react";
import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: string;
  children: React.ReactNode;
}

export default function Dialog({ open, onClose, title, width = "w-96", children }: Props) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={onClose}
    >
      <div
        className={`${width} rounded-lg border border-gb-border bg-gb-panel shadow-xl`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gb-border px-4 py-2">
          <span className="text-sm font-semibold text-gb-text">{title}</span>
          <button onClick={onClose} className="text-gb-text-muted hover:text-gb-text">
            <X size={14} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
