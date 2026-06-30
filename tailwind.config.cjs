/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./index.html', './src/**/*.{svelte,ts}'],
  theme: {
    extend: {
      boxShadow: {
        shadowbox: '0 28px 90px rgba(17, 24, 39, 0.24)'
      }
    }
  },
  plugins: []
};
