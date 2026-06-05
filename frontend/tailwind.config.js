/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eef2ff', 100: '#e0e7ff',
          500: '#6366f1', 600: '#4f46e5',
          700: '#4338ca', 800: '#3730a3', 900: '#312e81',
        },
        secondary: { 500: '#8b5cf6', 600: '#7c3aed' }
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
