import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // BrightPath Technology brand — light "paper & navy" system.
        // Named brand tokens:
        navy: { DEFAULT: "#1A2D52", soft: "#2a3f6b" },
        grey: "#5a6478",
        line: "#e3e6ec",
        tint: "#f7f8fa",

        // The newsroom historically used three semantic scales (ink = surfaces,
        // paper = text, brass = accent). They are remapped to the brand so every
        // existing class flips to the light navy look coherently.
        // ink = light surfaces / borders (was dark backgrounds)
        ink: {
          950: "#ffffff",
          900: "#f7f8fa",
          850: "#f2f4f7",
          800: "#eef1f5",
          700: "#e3e6ec",
          600: "#d3d8e2",
        },
        // paper = text on light (was light text on dark)
        paper: {
          50: "#111111",
          100: "#1a1d24",
          200: "#3a4250",
          300: "#5a6478",
          400: "#6c7689",
          500: "#9aa3b2",
        },
        // brass = brand accent, now navy
        brass: {
          DEFAULT: "#1A2D52",
          300: "#3a4f7d",
          400: "#2a3f6b",
          600: "#1A2D52",
        },
      },
      fontFamily: {
        // Poppins for display/headings, Lato for body — loaded in layout.tsx.
        display: ["var(--font-poppins)", "Poppins", "sans-serif"],
        serif: ["var(--font-poppins)", "Poppins", "Georgia", "serif"],
        sans: [
          "var(--font-lato)",
          "Lato",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "Helvetica",
          "Arial",
          "sans-serif",
        ],
      },
      keyframes: {
        pulseDot: {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.35" },
        },
      },
      animation: {
        pulseDot: "pulseDot 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
