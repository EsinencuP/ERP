import type { Config } from "tailwindcss";
import animate from "tailwindcss-animate";

const color = (token: string) => `hsl(var(--${token}) / <alpha-value>)`;
const pair = (token: string) => ({ DEFAULT: color(token), foreground: color(`${token}-foreground`) });

export default {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    container: { center: true, padding: "1.5rem", screens: { "2xl": "1440px" } },
    extend: {
      fontFamily: { sans: ["var(--font-geist-sans)", "sans-serif"], mono: ["var(--font-geist-mono)", "monospace"] },
      colors: {
        background: color("background"), foreground: color("foreground"), surface: color("color-surface"), border: color("border"), input: color("input"), ring: color("ring"),
        primary: pair("primary"), secondary: pair("secondary"), muted: pair("muted"), accent: pair("accent"), destructive: pair("destructive"), card: pair("card"), popover: pair("popover"),
        success: color("color-success"), warning: color("color-warning"), danger: color("color-danger"), info: color("color-info"),
        chart: { "1": color("chart-1"), "2": color("chart-2"), "3": color("chart-3"), "4": color("chart-4"), "5": color("chart-5") },
        sidebar: { DEFAULT: color("sidebar-background"), foreground: color("sidebar-foreground"), primary: color("sidebar-primary"), "primary-foreground": color("sidebar-primary-foreground"), accent: color("sidebar-accent"), "accent-foreground": color("sidebar-accent-foreground"), border: color("sidebar-border"), ring: color("sidebar-ring") },
      },
      borderRadius: { DEFAULT: "var(--radius)", sm: "calc(var(--radius) - 2px)", md: "var(--radius)", lg: "var(--radius)", xl: "calc(var(--radius) + 2px)", "2xl": "calc(var(--radius) + 4px)", "3xl": "calc(var(--radius) + 8px)" },
      boxShadow: {
        sm: "0 1px 2px hsl(var(--color-shadow))",
        DEFAULT: "0 1px 4px hsl(var(--color-shadow))",
        md: "0 4px 8px hsl(var(--color-shadow))",
        lg: "0 10px 20px hsl(var(--color-shadow))",
        xl: "0 16px 32px hsl(var(--color-shadow))",
        "2xl": "0 24px 48px hsl(var(--color-shadow))",
        inner: "inset 0 2px 4px hsl(var(--color-shadow))",
      },
    },
  },
  plugins: [animate],
} satisfies Config;
