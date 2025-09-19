/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        'ui-charcoal': '#181819',
        'ui-graphite': '#616162',
        'ui-silver': '#9E9E9E',
        'ui-warm-silver': '#C1C0BD',
        'ui-screen': '#E8E9EB',
        'ui-press': '#3AA6FF',
      },
      fontFamily: {
        'orbitron': ['Orbitron', 'system-ui', 'sans-serif'],
        'indigi': ['Indie Flower', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}



