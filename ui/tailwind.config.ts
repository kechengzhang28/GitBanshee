/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        gb: {
          bg: "var(--gb-bg)",
          text: "var(--gb-text)",
          "text-sec": "var(--gb-text-sec)",
          "text-muted": "var(--gb-text-muted)",
          accent: "var(--gb-accent)",
          "accent-h": "var(--gb-accent-h)",
          panel: "var(--gb-panel)",
          toolbar: "var(--gb-toolbar)",
          input: "var(--gb-input)",
          hover: "var(--gb-hover)",
          border: "var(--gb-border)",
          success: "var(--gb-success)",
          danger: "var(--gb-danger)",
          warning: "var(--gb-warning)",
        },
      },
    },
  },
  plugins: [],
};
