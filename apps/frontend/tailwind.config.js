/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: "#f5f8ff",
          100: "#e5eeff",
          200: "#c5d5ff",
          300: "#a3bcfe",
          400: "#7a99fc",
          500: "#4c70f7",
          600: "#3a56eb",
          700: "#2c40d3",
          800: "#2736a9",
          900: "#283484",
        },
        secondary: {
          50: "#f7f7f8",
          100: "#eeeef1",
          200: "#d5d5dd",
          300: "#b3b3c3",
          400: "#8c8ca5",
          500: "#6d6d8b",
          600: "#5a5a73",
          700: "#48485b",
          800: "#3b3b48",
          900: "#32323c",
        },
      },
      spacing: {
        "72": "18rem",
        "84": "21rem",
        "96": "24rem",
      },
      fontFamily: {
        sans: ["'Noto Sans TC'", "sans-serif"],
      },
      boxShadow: {
        card: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
      },
    },
  },
  plugins: [
    require("@tailwindcss/forms"),
  ],
} 