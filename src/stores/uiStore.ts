import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  theme: "dark" | "light";
  leftPanelWidth: number;
  rightPanelWidth: number;
  leftPanelVisible: boolean;

  setTheme: (theme: "dark" | "light") => void;
  setLeftPanelWidth: (w: number) => void;
  setRightPanelWidth: (w: number) => void;
  toggleLeftPanel: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "dark",
      leftPanelWidth: 240,
      rightPanelWidth: 340,
      leftPanelVisible: true,

      setTheme: (theme: "dark" | "light") => set({ theme }),
      setLeftPanelWidth: (w: number) => set({ leftPanelWidth: w }),
      setRightPanelWidth: (w: number) => set({ rightPanelWidth: w }),
      toggleLeftPanel: () =>
        set((s) => ({ leftPanelVisible: !s.leftPanelVisible })),
    }),
    {
      name: "gitbanshee-ui",
    },
  ),
);
