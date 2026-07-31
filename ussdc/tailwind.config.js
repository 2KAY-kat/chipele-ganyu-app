export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        text: "oklch(var(--text) / <alpha-value>)",
        background: "oklch(var(--background) / <alpha-value>)",
        primary: "oklch(var(--primary) / <alpha-value>)",
        secondary: "oklch(var(--secondary) / <alpha-value>)",
        accent: "oklch(var(--accent) / <alpha-value>)",
      },
    },
  },
  plugins: [],
}
