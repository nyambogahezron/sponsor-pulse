import { resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

/**
 * Inline plugin: flatten HTML entry paths so Vite doesn't mirror
 * the src/ directory structure inside dist/.
 * e.g. dist/src/popup/popup.html → dist/popup.html
 */
function flattenHtmlOutputs(): Plugin {
  return {
    name: 'flatten-html-outputs',
    closeBundle() {
      const { readdirSync, copyFileSync, existsSync, unlinkSync } =
        require('node:fs') as typeof import('node:fs');
      const { join } = require('node:path') as typeof import('node:path');
      const distDir = join(__dirname, 'dist');

      function walk(dir: string): string[] {
        return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
          const full = join(dir, entry.name);
          return entry.isDirectory() ? walk(full) : [full];
        });
      }

      for (const file of walk(distDir)) {
        if (!file.endsWith('.html')) continue;
        const dest = join(distDir, file.split('/').at(-1) || '');
        if (file !== dest && !existsSync(dest)) {
          copyFileSync(file, dest);
          unlinkSync(file);
          const name = file.split('/').at(-1) || '';
          console.log(`[flatten-html] ${file.replace(`${distDir}/`, '')} → ${name}`);
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [flattenHtmlOutputs()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: false,
    assetsInlineLimit: 0,
    rollupOptions: {
      input: {
        content: resolve(__dirname, 'src/content/index.ts'),
        background: resolve(__dirname, 'src/background/index.ts'),
        popup: resolve(__dirname, 'src/popup/popup.html'),
        onboard: resolve(__dirname, 'src/onboard/index.html'),
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
