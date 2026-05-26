import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#0f1117",
        surface: "#161b27",
        border: "#1e2535",
        teal: {
          DEFAULT: "#00d4a1",
          dark: "#00a37c",
        },
        blue: {
          DEFAULT: "#3b82f6",
          dark: "#2563eb",
        },
        red: {
          DEFAULT: "#ef4444",
          dark: "#dc2626",
        },
        amber: {
          DEFAULT: "#f59e0b",
          dark: "#d97706",
        },
        muted: "#6b7280",
        "text-primary": "#f1f5f9",
        "text-secondary": "#94a3b8",
      },
      fontFamily: {
        mono: ["IBM Plex Mono", "monospace"],
        sans: ["IBM Plex Sans", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
