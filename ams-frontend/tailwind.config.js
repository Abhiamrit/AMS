/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50:  '#f0f4f8',
          100: '#d9e4f0',
          200: '#b3c9e1',
          300: '#8daed2',
          400: '#6793c3',
          500: '#4178b4',
          600: '#2c5f8a',
          700: '#1a3a5c',
          800: '#112840',
          900: '#0a1828',
        },
        gold: {
          400: '#f5b942',
          500: '#e8a020',
          600: '#c4861a',
        }
      },
    },
  },
  plugins: [],
};

