import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        rush: {
          canvas: "var(--rush-canvas)",
          elevated: "var(--rush-elevated)",
          surface: "var(--rush-surface)",
          border: "var(--rush-border)",
          foreground: "var(--rush-foreground)",
          muted: "var(--rush-muted)",
          accent: "var(--rush-accent)",
          ink: "var(--rush-ink)",
        },
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 40px rgba(139, 92, 246, 0.14)",
        "glow-sm": "0 0 24px rgba(139, 92, 246, 0.22)",
      },
    },
  },
  plugins: [],
};

export default config;
