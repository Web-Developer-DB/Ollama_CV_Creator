import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#17202a",
        paper: "#f4f7fb",
        surface: "#ffffff",
        line: "#d9e2ec",
        muted: "#64748b",
        action: "#1d4ed8",
        accent: "#0f766e",
        warning: "#b45309"
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15, 23, 42, 0.06), 0 8px 24px rgba(15, 23, 42, 0.05)"
      }
    }
  },
  plugins: []
};

export default config;
