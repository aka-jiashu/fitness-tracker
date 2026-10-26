import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'charts-vendor': ['recharts'],
          'db-vendor': ['dexie', 'dexie-react-hooks'],
          'ui-vendor': ['lucide-react', 'canvas-confetti'],
        },
      },
    },
  },
});
