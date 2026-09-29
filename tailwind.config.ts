import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        canvas: "#F6F6FB",
        mist: "#EEF0FB",
        surface: "#FFFFFF",
        ink: "#1A1A2E",
        muted: "#6B7280",
        accent: { DEFAULT: "#7C3AED", hover: "#6D28D9", soft: "#F3EEFF" },
        gold: { DEFAULT: "#D97706", soft: "#FEF6E7" },
        line: "#E5E7EB",
      },
      fontFamily: {
        serif: ["var(--font-playfair)", "Georgia", "serif"],
        sans: ["var(--font-inter)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(26,26,46,0.04), 0 8px 24px -8px rgba(26,26,46,0.08)",
        lift: "0 2px 4px rgba(26,26,46,0.06), 0 16px 32px -12px rgba(124,58,237,0.35)",
        glow: "0 0 0 4px rgba(124,58,237,0.12), 0 0 32px rgba(124,58,237,0.18)",
      },
      keyframes: {
        shimmer: { "0%": { transform: "translateX(-100%)" }, "100%": { transform: "translateX(200%)" } },
        scan: { "0%, 100%": { top: "8%" }, "50%": { top: "88%" } },
        twinkle: { "0%, 100%": { opacity: "0.25" }, "50%": { opacity: "1" } },
        bounceDot: { "0%, 80%, 100%": { transform: "scale(0.6)", opacity: "0.4" }, "40%": { transform: "scale(1)", opacity: "1" } },
      },
      animation: {
        shimmer: "shimmer 2.8s ease-in-out infinite",
        scan: "scan 2.4s ease-in-out infinite",
        twinkle: "twinkle 3s ease-in-out infinite",
        dot: "bounceDot 1.2s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
