import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          bg: "#f7f6fd",
          strong: "#ede9fe",
          panel: "#ffffff",
          muted: "#faf9ff",
          ink: "#1e1b33",
          gray: "#64748b",
          line: "#e9e7f5",
          teal: "#7c3aed",
          tealStrong: "#6d28d9",
          amber: "#fb923c",
          coral: "#fb7185",
          blue: "#6366f1",
          danger: "#e11d48",
          success: "#10b981",
        }
      },
      boxShadow: {
        custom: "0 1px 2px rgba(124, 58, 237, 0.05), 0 12px 30px -14px rgba(124, 58, 237, 0.20)",
      }
    },
  },
  plugins: [],
};
export default config;
