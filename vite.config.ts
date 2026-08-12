import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    // In production, frontend and API share one Vercel domain, so a relative "/api" path
    // just works. Locally there's no such shared origin. `npm run dev:api` runs the
    // Express app standalone on :4000, and this proxy makes "/api" resolve to it from the
    // Vite dev server too, so the frontend code never needs to know the difference.
    proxy: {
      '/api': {
        target: 'http://localhost:4000',
        changeOrigin: true,
      },
    },
  },
});
