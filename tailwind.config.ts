import type { Config } from "tailwindcss";

export default {
  darkMode: ["class"],
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  prefix: "",
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      // Uber Base Design System Colors
      colors: {
        // Base Design System
        "base-black": "hsl(var(--base-black))",
        "base-white": "hsl(var(--base-white))",
        "base-gray50": "hsl(var(--base-gray50))",
        "base-gray100": "hsl(var(--base-gray100))",
        "base-gray200": "hsl(var(--base-gray200))",
        "base-gray300": "hsl(var(--base-gray300))",
        "base-gray400": "hsl(var(--base-gray400))",
        "base-gray500": "hsl(var(--base-gray500))",
        "base-gray600": "hsl(var(--base-gray600))",
        "base-gray700": "hsl(var(--base-gray700))",
        "base-gray800": "hsl(var(--base-gray800))",
        "base-gray900": "hsl(var(--base-gray900))",
        "base-positive": "hsl(var(--base-positive))",
        "base-positiveDark": "hsl(var(--base-positiveDark))",
        "base-positiveLight": "hsl(var(--base-positiveLight))",
        "base-negative": "hsl(var(--base-negative))",
        "base-negativeDark": "hsl(var(--base-negativeDark))",
        "base-negativeLight": "hsl(var(--base-negativeLight))",
        "base-warning": "hsl(var(--base-warning))",
        "base-warningDark": "hsl(var(--base-warningDark))",
        "base-warningLight": "hsl(var(--base-warningLight))",
        "base-accent": "hsl(var(--base-accent))",
        "base-accentDark": "hsl(var(--base-accentDark))",
        "base-accentLight": "hsl(var(--base-accentLight))",

        // Legacy support (shadcn/ui compatibility)
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // Semantic colors
        success: {
          DEFAULT: "hsl(var(--success))",
          foreground: "hsl(var(--success-foreground))",
        },
        warning: {
          DEFAULT: "hsl(var(--warning))",
          foreground: "hsl(var(--warning-foreground))",
        },
        info: {
          DEFAULT: "hsl(var(--info))",
          foreground: "hsl(var(--info-foreground))",
        },
        // Health indicators
        health: {
          green: "hsl(var(--health-green))",
          yellow: "hsl(var(--health-yellow))",
          red: "hsl(var(--health-red))",
        },
        // Chart colors
        chart: {
          1: "hsl(var(--chart-1))",
          2: "hsl(var(--chart-2))",
          3: "hsl(var(--chart-3))",
          4: "hsl(var(--chart-4))",
          5: "hsl(var(--chart-5))",
        },
      },

      // Uber Base Spacing (4px base)
      spacing: {
        "0.5": "2px",
        "1": "4px",
        "1.5": "6px",
        "2": "8px",
        "2.5": "10px",
        "3": "12px",
        "3.5": "14px",
        "4": "16px",
        "5": "20px",
        "6": "24px",
        "7": "28px",
        "8": "32px",
        "9": "36px",
        "10": "40px",
        "11": "44px",
        "12": "48px",
        "14": "56px",
        "16": "64px",
        "20": "80px",
        "24": "96px",
      },

      // Uber Base Typography
      fontFamily: {
        display: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        text: ['"Inter"', 'system-ui', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'Roboto', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', '"SF Mono"', 'Menlo', 'Consolas', 'monospace'],
      },

      fontSize: {
        "display1": ["96px", { lineHeight: "112px", letterSpacing: "-1.5px", fontWeight: "700" }],
        "display2": ["60px", { lineHeight: "72px", letterSpacing: "-0.5px", fontWeight: "700" }],
        "h1": ["48px", { lineHeight: "56px", letterSpacing: "0px", fontWeight: "700" }],
        "h2": ["34px", { lineHeight: "42px", letterSpacing: "0.25px", fontWeight: "700" }],
        "h3": ["24px", { lineHeight: "32px", letterSpacing: "0px", fontWeight: "700" }],
        "h4": ["20px", { lineHeight: "28px", letterSpacing: "0.15px", fontWeight: "700" }],
        "h5": ["18px", { lineHeight: "24px", letterSpacing: "0px", fontWeight: "700" }],
        "h6": ["16px", { lineHeight: "22px", letterSpacing: "0.15px", fontWeight: "700" }],
        "body-lg": ["16px", { lineHeight: "24px", letterSpacing: "0.5px", fontWeight: "400" }],
        "body": ["14px", { lineHeight: "20px", letterSpacing: "0.25px", fontWeight: "400" }],
        "body-sm": ["12px", { lineHeight: "16px", letterSpacing: "0.4px", fontWeight: "400" }],
        "caption": ["11px", { lineHeight: "14px", letterSpacing: "0.4px", fontWeight: "400" }],
        "label": ["12px", { lineHeight: "16px", letterSpacing: "0.5px", fontWeight: "500" }],
      },

      // Border radius
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        base: "4px",
        xl: "12px",
        "2xl": "16px",
      },

      // Box shadows (Uber Base elevation)
      boxShadow: {
        "base-sm": "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
        "base": "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        "base-md": "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
        "base-lg": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        "base-xl": "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
        "base-2xl": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
      },

      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "pulse-glow": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "fade-in": {
          from: { opacity: "0", transform: "translateY(10px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "slide-up": {
          from: { opacity: "0", transform: "translateY(20px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "pulse-glow": "pulse-glow 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "fade-in": "fade-in 0.5s ease-out forwards",
        "slide-up": "slide-up 0.4s ease-out forwards",
        "scale-in": "scale-in 0.3s ease-out forwards",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
} satisfies Config;
