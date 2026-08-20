/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Vazirmatn', 'Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        navy: {
          50:  '#eef0f7',
          100: '#d0d4e8',
          200: '#a1a9d1',
          300: '#7279b5',
          400: '#4e569e',
          500: '#333b84',
          600: '#272e6e',
          700: '#1e2358',
          800: '#161a42',
          900: '#0f112e',
          950: '#0a0c1f',
        },
      },
    },
  },
  plugins: [],
}
