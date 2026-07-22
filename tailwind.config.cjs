/** @type {import('tailwindcss').Config} */

// Routes the neutral/teal/amber/red palettes through CSS custom properties
// (set at runtime by src/lib/theme/applyTheme.ts) instead of fixed hex values,
// so the whole app re-themes without touching component classes. Falls back to
// the stock Tailwind hex value if the variable isn't set (e.g. during SSR/print).
function themedColor(name, fallback) {
  const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
  return Object.fromEntries(
    shades.map((shade) => [
      shade,
      ({ opacityValue }) =>
        opacityValue === undefined
          ? `rgb(var(--color-${name}-${shade}, ${fallback[shade]}))`
          : `rgb(var(--color-${name}-${shade}, ${fallback[shade]}) / ${opacityValue})`
    ])
  );
}

const fallback = {
  neutral: { 50: '250 250 250', 100: '245 245 245', 200: '229 229 229', 300: '212 212 212', 400: '163 163 163', 500: '115 115 115', 600: '82 82 82', 700: '64 64 64', 800: '38 38 38', 900: '23 23 23', 950: '10 10 10' },
  teal: { 50: '240 253 250', 100: '204 251 241', 200: '153 246 228', 300: '94 234 212', 400: '45 212 191', 500: '20 184 166', 600: '13 148 136', 700: '15 118 110', 800: '17 94 89', 900: '19 78 74', 950: '4 47 46' },
  amber: { 50: '255 251 235', 100: '254 243 199', 200: '253 230 138', 300: '252 211 77', 400: '251 191 36', 500: '245 158 11', 600: '217 119 6', 700: '180 83 9', 800: '146 64 14', 900: '120 53 15', 950: '69 26 3' },
  red: { 50: '254 242 242', 100: '254 226 226', 200: '254 202 202', 300: '252 165 165', 400: '248 113 113', 500: '239 68 68', 600: '220 38 38', 700: '185 28 28', 800: '153 27 27', 900: '127 29 29', 950: '69 10 10' }
};

module.exports = {
  content: ['./index.html', './src/**/*.{svelte,ts}'],
  theme: {
    extend: {
      colors: {
        neutral: themedColor('neutral', fallback.neutral),
        teal: themedColor('teal', fallback.teal),
        amber: themedColor('amber', fallback.amber),
        red: themedColor('red', fallback.red)
      },
      boxShadow: {
        shadowbox: '0 28px 90px rgba(17, 24, 39, 0.24)'
      }
    }
  },
  plugins: []
};
