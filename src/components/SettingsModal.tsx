import { X } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SettingsModal({ open, onClose }: Props) {
  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose} />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
        <div className="pointer-events-auto flex w-[520px] max-h-[80vh] flex-col rounded-lg border border-gb-border bg-gb-panel shadow-2xl">
          {/* ── Header ──────────────────────────── */}
          <div className="flex h-10 shrink-0 items-center border-b border-gb-border px-3 text-xs font-semibold uppercase tracking-wider text-gb-text-sec">
            Settings
            <div className="flex-1" />
            <button
              onClick={onClose}
              className="flex items-center justify-center rounded p-0.5 text-gb-text-sec hover:bg-gb-hover hover:text-gb-text"
            >
              <X size={14} />
            </button>
          </div>

          {/* ── Body ────────────────────────────── */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex flex-col items-center justify-center py-8 text-gb-text-muted">
              <p className="text-xs">Settings panel coming soon.</p>
              <p className="mt-1 text-[11px]">General, Appearance, and more.</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
