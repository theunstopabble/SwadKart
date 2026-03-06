/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // 🔥 Your Signature Colors
        primary: "#ff6b6b", // SwadKart Neon Red
        secondary: "#1a1a1a", // Deep Dark
        accent: "#ff9f43", // Warm Orange (for ratings/badges)

        // 🌑 Neutral Palette for Professional Dark Mode
        dark: {
          950: "#030712", // Purest Black
          900: "#0f172a", // Background Dark
          800: "#1e293b", // Card/Input Surface
          700: "#334155", // Borders/Subtle lines
        },
      },
      fontFamily: {
        // System font stack: zero network requests, instant loading
        sans: ["-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "sans-serif"],
      },
      boxShadow: {
        "neon-primary": "0 0 15px rgba(255, 107, 107, 0.4)",
      },
      animation: {
        "fade-in": "fadeIn 0.5s ease-out forwards",
        "slide-up": "slideUp 0.4s ease-out forwards",
      },
      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        slideUp: {
          "0%": { transform: "translateY(20px)", opacity: "0" },
          "100%": { transform: "translateY(0)", opacity: "1" },
        },
      },
    },
  },
  plugins: [
    // Agar scrollbar hide karni hai plugin se:
    // require('tailwind-scrollbar-hide'),
  ],
};
