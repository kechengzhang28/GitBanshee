import { create } from "zustand";

type ToastType = "success" | "error" | "info";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  exiting: boolean;
}

interface ToastState {
  toasts: Toast[];
  show: (type: ToastType, message: string, duration?: number) => void;
  remove: (id: string) => void;
}

let counter = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],

  show: (type, message, duration = 4000) => {
    counter += 1;
    const id = `${counter}-${Date.now()}`;
    set((s) => {
      let next = [...s.toasts, { id, type, message, duration, exiting: false }];
      if (next.length > 5) next = next.slice(next.length - 5);
      return { toasts: next };
    });
    if (duration > 0) {
      setTimeout(() => {
        set((s) => ({ toasts: s.toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t)) }));
        setTimeout(() => {
          set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
        }, 300);
      }, duration);
    }
  },

  remove: (id) => {
    set((s) => ({ toasts: s.toasts.map((t) => (t.id === id ? { ...t, exiting: true } : t)) }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 300);
  },
}));

// Static access so non-React code can trigger toasts
export const toast = (type: ToastType, message: string, duration?: number) => {
  useToastStore.getState().show(type, message, duration);
};
