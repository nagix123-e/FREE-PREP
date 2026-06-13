/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#172033",
        muted: "#64748b",
        line: "#d9e2ec"
      },
      boxShadow: {
        panel: "0 14px 30px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
};
