import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        oled: "#000000",
        sidebar: "#0d0f12",
        surface: "#16191f",
        surfaceHover: "#1e222b",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "-apple-system", "sans-serif"],
        serif: ["Georgia", "Cambria", "Times New Roman", "serif"],
        mono: ["JetBrains Mono", "Fira Code", "monospace"],
      },
      boxShadow: {
        "amber-glow": "0 0 25px -5px rgba(245, 158, 11, 0.25)",
        "cyan-glow": "0 0 25px -5px rgba(6, 182, 212, 0.25)",
        "emerald-glow": "0 0 25px -5px rgba(16, 185, 129, 0.25)",
        "violet-glow": "0 0 25px -5px rgba(168, 85, 247, 0.25)",
      },
    },
  },
  plugins: [],
};

export default config;
