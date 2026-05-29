import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        paper: "#f8fafc",
        surface: "#ffffff",
        line: "#e2e8f0",
        muted: "#64748b",
        action: "#4f46e5",
        accent: "#6366f1",
        success: "#10b981",
        warning: "#f59e0b"
      },
      boxShadow: {
        panel: "0 1px 2px rgba(15, 23, 42, 0.04), 0 14px 40px rgba(15, 23, 42, 0.06)",
        window: "0 20px 70px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};

export default config;
