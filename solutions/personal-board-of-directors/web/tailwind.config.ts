import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        board: {
          bg: "rgb(var(--board-bg) / <alpha-value>)",
          surface: "rgb(var(--board-surface) / <alpha-value>)",
          "surface-raised": "rgb(var(--board-surface-raised) / <alpha-value>)",
          text: "rgb(var(--board-text) / <alpha-value>)",
          "text-secondary": "rgb(var(--board-text-secondary) / <alpha-value>)",
          "text-tertiary": "rgb(var(--board-text-tertiary) / <alpha-value>)",
          accent: "rgb(var(--board-accent) / <alpha-value>)",
          "accent-contrast": "rgb(var(--board-accent-contrast) / <alpha-value>)",
          "accent-glow": "rgb(var(--board-accent) / 0.08)",
          border: "var(--board-border)",
          "border-hover": "var(--board-border-hover)",
        },
      },
      fontFamily: {
        serif: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
        sans: ["var(--font-sans)", "Inter", "system-ui", "sans-serif"],
      },
      animation: {
        "fade-in": "fadeIn 0.4s ease-out",
        "slide-up": "slideUp 0.4s ease-out",
        pulse: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        blink: "blink 1s steps(1) infinite",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        blink: {
          "0%, 50%": { opacity: "1" },
          "51%, 100%": { opacity: "0" },
        },
      },
    },
  },
  plugins: [],
};

export default config;
