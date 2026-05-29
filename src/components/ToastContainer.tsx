import { useEffect, useRef, useState } from "react";
import { CheckCircle2, AlertTriangle, Info, X } from "lucide-react";
import { useToastStore } from "../stores/toastStore";

function getColors(type: string) {
  if (type === "success") return { bg: "var(--gb-success)", text: "#ffffff" };
  if (type === "error") return { bg: "var(--gb-danger)", text: "#ffffff" };
  return { bg: "var(--gb-accent)", text: "#ffffff" };
}

function getIcon(type: string) {
  if (type === "success") return CheckCircle2;
  if (type === "error") return AlertTriangle;
  return Info;
}

function ToastBar({ id, type, message, duration }: {
  id: string;
  type: "success" | "error" | "info";
  message: string;
  duration: number;
}) {
  const remove = useToastStore((s) => s.remove);
  const colors = getColors(type);
  const Icon = getIcon(type);
  const barRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const startRef = useRef(Date.now());
  const rafRef = useRef(0);

  useEffect(() => {
    const animate = () => {
      const elapsed = Date.now() - startRef.current;
      const progress = paused ? (parseFloat(barRef.current?.style.width ?? "100")) : Math.max(0, 100 - (elapsed / duration) * 100);
      if (barRef.current) barRef.current.style.width = `${progress}%`;
      if (progress > 0) rafRef.current = requestAnimationFrame(animate);
    };
    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [duration, paused]);

  return (
    <div
      className="flex flex-col rounded-lg border border-gb-border bg-gb-panel shadow-lg overflow-hidden"
      style={{ width: 320 }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="flex items-center gap-2 px-3 py-2">
        <Icon size={14} style={{ color: colors.bg }} className="shrink-0" />
        <span className="flex-1 truncate text-xs text-gb-text">{message}</span>
        <button
          onClick={() => remove(id)}
          className="shrink-0 rounded p-0.5 text-gb-text-muted hover:text-gb-text"
        >
          <X size={12} />
        </button>
      </div>
      <div className="h-0.5 w-full bg-gb-border">
        <div
          ref={barRef}
          className="h-full transition-none"
          style={{ width: "100%", backgroundColor: colors.bg }}
        />
      </div>
    </div>
  );
}

export default function ToastContainer() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div className="pointer-events-none fixed bottom-14 right-4 z-50 flex flex-col-reverse gap-2">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto transition-all duration-300"
          style={{
            opacity: t.exiting ? 0 : 1,
            transform: t.exiting ? "translateX(100%)" : "translateX(0)",
          }}
        >
          <ToastBar id={t.id} type={t.type} message={t.message} duration={t.duration} />
        </div>
      ))}
    </div>
  );
}
