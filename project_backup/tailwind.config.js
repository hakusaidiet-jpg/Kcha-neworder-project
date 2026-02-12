/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        matcha: {
          50: '#f7fcf7',
          100: '#ebf7eb',
          200: '#d4ebd4',
          300: '#addbad',
          400: '#7ec47e',
          500: '#54a654',
          600: '#3d863d',
          700: '#326b32',
          800: '#2a552a',
          900: '#234623',
        },
        hojicha: {
           500: '#6B4423',
        }
      },
    },
  },
  plugins: [],
}
