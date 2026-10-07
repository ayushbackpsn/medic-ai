/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          500: '#0284c7',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
        },
        risk: {
          low: '#10b981',      // Green
          medium: '#f59e0b',   // Amber / Orange
          high: '#f97316',     // Bright Orange
          critical: '#ef4444'  // Red
        }
      }
    },
  },
  plugins: [],
}
