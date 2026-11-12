import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        base: {
          DEFAULT: '#050505',
          surface: '#0D0D0D',
          elevated: '#131313',
          border: 'rgba(255,255,255,0.08)',
        },
        ink: {
          DEFAULT: '#F5F5F5',
          muted: '#8A8A8A',
          faint: '#555555',
        },
        signal: {
          50: '#F3F0FA',
          200: '#D4CBEE',
          400: '#A394D9',
          500: '#7E6BC4',
          600: '#6A57AE',
          700: '#554590',
        },
        ember: {
          400: '#D9B38C',
          500: '#C49A6C',
          600: '#A87D52',
        },
        success: '#34D399',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'signal-gradient': 'linear-gradient(135deg, #7E6BC4 0%, #C49A6C 100%)',
        'aurora': 'radial-gradient(45% 35% at 50% -5%, rgba(126,107,196,0.14) 0%, rgba(5,5,5,0) 60%), radial-gradient(40% 40% at 90% 0%, rgba(196,154,108,0.08) 0%, rgba(5,5,5,0) 60%)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(126,107,196,0.35), 0 8px 40px -8px rgba(126,107,196,0.35)',
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
