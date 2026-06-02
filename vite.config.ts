import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    // Output to dist/ (Chrome will load this folder)
    outDir: 'dist',
    emptyOutDir: true,

    rollupOptions: {
      input: {
        // Entry point: our content script
        content: resolve(__dirname, 'src/content.ts'),
      },
      output: {
        // CRITICAL: disable hashing so manifest.json filenames stay stable
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]',
      },
    },
  },
});
