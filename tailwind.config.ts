import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        ink: "#1f2933",
        paper: "#f8fafc",
        action: "#2563eb",
        accent: "#0f766e"
      }
    }
  },
  plugins: []
};

export default config;
