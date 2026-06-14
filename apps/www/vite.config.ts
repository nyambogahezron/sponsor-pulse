import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  base: '/sponsor-pulse/', // GitHub Pages repository path
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        privacy: resolve(__dirname, 'privacy.html'),
      },
    },
  },
});
