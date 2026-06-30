import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  base: './',
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/icd-auth': {
        target: 'https://icdaccessmanagement.who.int',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/icd-auth/, '')
      },
      '/icd-api': {
        target: 'https://id.who.int',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/icd-api/, '')
      }
    }
  },
  build: {
    outDir: 'dist',
  },
});
