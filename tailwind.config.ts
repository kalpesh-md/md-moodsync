import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./screens/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        heading: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        navy: {
          DEFAULT: "#1E3A5F",
          dark: "#152A45",
          mid: "#2D5A8B",
        },
        ms: {
          navy: "rgb(var(--ms-navy-rgb) / <alpha-value>)",
          "navy-dark": "rgb(var(--ms-navy-dark-rgb) / <alpha-value>)",
          mid: "rgb(var(--ms-mid-rgb) / <alpha-value>)",
          soft: "rgb(var(--ms-soft-rgb) / <alpha-value>)",
          sky: "rgb(var(--ms-sky-rgb) / <alpha-value>)",
          "sky-soft": "rgb(var(--ms-sky-soft-rgb) / <alpha-value>)",
          emerald: "rgb(var(--ms-emerald-rgb) / <alpha-value>)",
          "emerald-soft": "rgb(var(--ms-emerald-soft-rgb) / <alpha-value>)",
          amber: "rgb(var(--ms-amber-rgb) / <alpha-value>)",
          "amber-soft": "rgb(var(--ms-amber-soft-rgb) / <alpha-value>)",
          ink: "rgb(var(--ms-ink-rgb) / <alpha-value>)",
          ink2: "rgb(var(--ms-ink2-rgb) / <alpha-value>)",
          ink3: "rgb(var(--ms-ink3-rgb) / <alpha-value>)",
          line: "rgb(var(--ms-line-rgb) / <alpha-value>)",
          "line-strong": "rgb(var(--ms-line-strong-rgb) / <alpha-value>)",
          tint: "rgb(var(--ms-tint-rgb) / <alpha-value>)",
          bg: "rgb(var(--ms-bg-rgb) / <alpha-value>)",
          card: "rgb(var(--ms-card-rgb) / <alpha-value>)",
        },
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.04), 0 6px 20px rgba(16,24,40,0.05)",
        lift: "0 10px 30px rgba(16,24,40,0.10)",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
