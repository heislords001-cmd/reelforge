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
          50: '#F6ECFF',
          200: '#E0B3FF',
          400: '#C77DFF',
          500: '#B14AFF',
          600: '#9333EA',
          700: '#7E22CE',
        },
        ember: {
          400: '#FF6EC7',
          500: '#FF2E9A',
          600: '#E0157A',
        },
        success: '#34D399',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'ui-monospace', 'monospace'],
      },
      backgroundImage: {
        'signal-gradient': 'linear-gradient(135deg, #B14AFF 0%, #FF2E9A 100%)',
        'aurora': 'radial-gradient(45% 35% at 50% -5%, rgba(177,74,255,0.16) 0%, rgba(5,5,5,0) 60%), radial-gradient(40% 40% at 90% 0%, rgba(255,46,154,0.12) 0%, rgba(5,5,5,0) 60%)',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(177,74,255,0.4), 0 8px 40px -8px rgba(177,74,255,0.5)',
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
