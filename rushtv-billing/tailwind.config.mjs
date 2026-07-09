/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      colors: {
        canvas: '#222021',
        elevated: '#2a2829',
        surface: '#2f2d2e',
        border: 'rgba(255, 255, 255, 0.08)',
        foreground: '#f4f6fb',
        muted: '#9aa3b8',
        accent: {
          DEFAULT: '#8b5cf6',
          secondary: '#38bdf8',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans"', 'Helvetica Neue', 'Arial', 'sans-serif'],
        display: ['"IBM Plex Sans"', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 40px rgb(139 92 246 / 0.14)',
        'glow-sm': '0 0 24px rgb(139 92 246 / 0.22)',
      },
    },
  },
  plugins: [],
};
