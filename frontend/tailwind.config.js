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
        primary: {
          50: '#f0f4ff',
          100: '#e0e9ff',
          200: '#c7d7ff',
          300: '#a4b8ff',
          400: '#818dff',
          500: '#667eea',
          600: '#764ba2',
          700: '#5a3d7a',
          800: '#4a3262',
          900: '#3d2a4f',
        },
        mood: {
          happy: '#4ade80',
          sad: '#60a5fa',
          angry: '#f87171',
          anxious: '#fbbf24',
          excited: '#f472b6',
          calm: '#34d399',
          neutral: '#9ca3af',
        },
      },
      backgroundImage: {
        'gradient-primary': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      },
    },
  },
  plugins: [],
}

