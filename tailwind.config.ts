import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef4ff",
          100: "#dce8ff",
          200: "#b9d0ff",
          300: "#8bb0ff",
          400: "#5c8dff",
          500: "#2f66f0", // blu primario
          600: "#1f4fd6",
          700: "#193fab",
          800: "#173a8f",
          900: "#152f6e",
        },
        surface: {
          light: "#f5f7fb", // grigio chiaro
          DEFAULT: "#ffffff",
          border: "#e4e8f1",
        },
        correct: "#1f9d5a",
        wrong: "#e0433d",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        pulseRing: {
          "0%": { boxShadow: "0 0 0 0 rgba(47,102,240,0.35)" },
          "100%": { boxShadow: "0 0 0 8px rgba(47,102,240,0)" },
        },
      },
      animation: {
        fadeIn: "fadeIn 0.35s ease-out",
        pulseRing: "pulseRing 1.6s ease-out infinite",
      },
    },
  },
  plugins: [],
};
export default config;
