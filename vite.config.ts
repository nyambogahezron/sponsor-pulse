import { defineConfig } from 'vite';
import { resolve } from 'path';

/**
 * Vite config for SponsorPulse Chrome Extension (Manifest V3)
 *
 * Key rules for Chrome Extensions:
 *  1. No filename hashing — manifest.json references exact filenames.
 *  2. No HMR / live-reload — Chrome loads static files from dist/.
 *  3. Each extension entry point (content, background, popup) is a
 *     separate Rollup input so they compile to predictable paths.
 */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.ts'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name].js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name?.endsWith('.css')) return '[name].css';
          return 'assets/[name].[ext]';
        },
      },
    },
  },
  server: {
    open: false,
  },
});
