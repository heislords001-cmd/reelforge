import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: '#08080C',
          surface: '#111118',
          elevated: '#16161F',
          border: 'rgba(255,255,255,0.08)',
        },
        ink: {
          DEFAULT: '#F3F3F6',
          muted: '#9C9BA8',
          faint: '#6B6A76',
        },
        signal: {
          50: '#F1EEFF',
          200: '#C7BBFF',
          400: '#9C86FF',
          500: '#7C5CFF',
          600: '#6540F0',
          700: '#4F2ED1',
        },
        ember: {
          400: '#FF9D6C',
          500: '#FF8A5B',
          600: '#F2703C',
        },
        success: '#34D399',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'signal-gradient': 'linear-gradient(135deg, #7C5CFF 0%, #FF8A5B 100%)',
        'aurora': 'radial-gradient(60% 60% at 20% 0%, rgba(124,92,255,0.20) 0%, rgba(8,8,12,0) 60%), radial-gradient(50% 50% at 90% 10%, rgba(255,138,91,0.14) 0%, rgba(8,8,12,0) 60%)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(124,92,255,0.4), 0 8px 40px -8px rgba(124,92,255,0.45)',
        card: '0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 40px -20px rgba(0,0,0,0.6)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-up': 'fade-up 0.5s ease-out both',
        shimmer: 'shimmer 2.2s linear infinite',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
