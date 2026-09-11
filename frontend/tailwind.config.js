/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        darkBg: "#0B0E14",
        cardBg: "#121824",
        borderDark: "#1E293B",
        bidGreen: "#00E676",
        askRed: "#FF1744",
        accentBlue: "#2979FF",
        goldAccent: "#FFD700"
      },
      fontFamily: {
        mono: ["Consolas", "Monaco", "Courier New", "monospace"]
      }
    },
  },
  plugins: [],
}
