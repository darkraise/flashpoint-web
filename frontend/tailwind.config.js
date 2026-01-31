/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
      padding: "2rem",
      screens: {
        "2xl": "1400px",
      },
    },
    extend: {
      colors: {
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
        "toast-success": {
          DEFAULT: "hsl(var(--toast-success))",
          foreground: "hsl(var(--toast-success-foreground))",
          icon: "hsl(var(--toast-success-icon))",
          border: "hsl(var(--toast-success-border))",
        },
        "toast-error": {
          DEFAULT: "hsl(var(--toast-error))",
          foreground: "hsl(var(--toast-error-foreground))",
          icon: "hsl(var(--toast-error-icon))",
          border: "hsl(var(--toast-error-border))",
        },
        "toast-warning": {
          DEFAULT: "hsl(var(--toast-warning))",
          foreground: "hsl(var(--toast-warning-foreground))",
          icon: "hsl(var(--toast-warning-icon))",
          border: "hsl(var(--toast-warning-border))",
        },
        "toast-info": {
          DEFAULT: "hsl(var(--toast-info))",
          foreground: "hsl(var(--toast-info-foreground))",
          icon: "hsl(var(--toast-info-icon))",
          border: "hsl(var(--toast-info-border))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
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
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        float: {
          "0%, 100%": {
            transform: "translateY(0) rotate(0deg)",
          },
          "50%": {
            transform: "translateY(-8px) rotate(1deg)",
          },
        },
        "fade-in": {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        "fade-in-up": {
          "0%": {
            opacity: "0",
            transform: "translateY(20px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        "slide-in-down": {
          "0%": {
            opacity: "0",
            transform: "translateY(-10px)",
          },
          "100%": {
            opacity: "1",
            transform: "translateY(0)",
          },
        },
        // Prismatic Light Diffusion - Gradient drift animations
        "prismatic-drift-1": {
          "0%": {
            transform: "translate(0%, 0%) scale(1)",
          },
          "25%": {
            transform: "translate(12%, -8%) scale(1.08)",
          },
          "50%": {
            transform: "translate(18%, 5%) scale(1.12)",
          },
          "75%": {
            transform: "translate(-8%, 15%) scale(1.05)",
          },
          "100%": {
            transform: "translate(0%, 0%) scale(1)",
          },
        },
        "prismatic-drift-2": {
          "0%": {
            transform: "translate(0%, 0%) scale(1) rotate(0deg)",
          },
          "30%": {
            transform: "translate(-15%, 10%) scale(1.1) rotate(3deg)",
          },
          "60%": {
            transform: "translate(10%, -12%) scale(0.95) rotate(-2deg)",
          },
          "100%": {
            transform: "translate(0%, 0%) scale(1) rotate(0deg)",
          },
        },
        "prismatic-drift-3": {
          "0%": {
            transform: "translate(0%, 0%) scale(1)",
          },
          "33%": {
            transform: "translate(-5%, 10%) scale(1.06)",
          },
          "66%": {
            transform: "translate(8%, -8%) scale(0.98)",
          },
          "100%": {
            transform: "translate(0%, 0%) scale(1)",
          },
        },
        "prismatic-glow": {
          "0%, 100%": { opacity: "0.6" },
          "50%": { opacity: "0.85" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 2s infinite linear",
        float: "float 6s ease-in-out infinite",
        "fade-in": "fade-in 0.5s ease-out",
        "fade-in-up": "fade-in-up 0.6s ease-out",
        "slide-in-down": "slide-in-down 0.3s ease-out",
        // Prismatic Light Diffusion animations
        "prismatic-drift-1": "prismatic-drift-1 60s ease-in-out infinite",
        "prismatic-drift-2": "prismatic-drift-2 70s ease-in-out infinite",
        "prismatic-drift-3": "prismatic-drift-3 80s ease-in-out infinite",
        "prismatic-glow": "prismatic-glow 8s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate"), require("@tailwindcss/typography")],
};
