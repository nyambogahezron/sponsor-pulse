import { defineConfig } from 'vite';

// https://vitejs.dev/config/
export default defineConfig({
  // Use /sponsor-pulse/ base path when building for GitHub Pages
  base: process.env.GITHUB_PAGES === 'true' ? '/sponsor-pulse/' : '/',
});
