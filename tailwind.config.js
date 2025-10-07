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
        // Silver Fade Colors
        'heijo-bg-top': '#F7F7F8',
        'heijo-bg-bottom': '#F3F3F5',
        'heijo-silver-top': '#EAEAEA',
        'heijo-silver-bottom': '#DCDCDC',
        'heijo-card': '#F8F8FA',
        'heijo-card-top': '#F8F8FA',
        'heijo-card-bottom': '#F4F4F6',
        'heijo-border': '#D9D9DC',
        'heijo-border-light': '#D0D0D0',
        'heijo-text': '#1A1A1A',
        
        // Legacy colors for compatibility
        'mist-white': '#F8F8FA',
        'graphite-charcoal': '#1A1A1A',
        'soft-silver': '#D9D9DC',
        'tactile-taupe': '#D9D9DC',
        'text-primary': '#1A1A1A',
        'text-secondary': '#6A6A6A',
        'text-caption': '#9A9A9A',
        'text-inverse': '#F8F8FA',
      },
      fontFamily: {
        'brand': ['Futura', 'URW Geometric', 'Avenir Next', 'Helvetica Neue', 'system-ui', 'sans-serif'],
        'subheading': ['Futura', 'URW Geometric', 'Avenir Next', 'Helvetica Neue', 'system-ui', 'sans-serif'],
        'body': ['Inter', 'Helvetica Neue', 'system-ui', 'sans-serif'],
        'caption': ['Inter', 'Helvetica Neue', 'system-ui', 'sans-serif'],
        'orbitron': ['Orbitron', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        breathing: {
          "0%, 100%": { transform: "scale(1)" },
          "50%": { transform: "scale(1.05)" },
        },
        wordByWord: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        silverGlow: {
          "0%, 100%": { boxShadow: "0 0 20px rgba(192, 192, 192, 0.3)" },
          "50%": { boxShadow: "0 0 30px rgba(192, 192, 192, 0.5)" },
        },
      },
      animation: {
        breathing: "breathing 4s ease-in-out infinite",
        wordByWord: "wordByWord 0.6s ease-out forwards",
        silverGlow: "silverGlow 1s ease-out",
      },
    },
  },
  plugins: [],
}



