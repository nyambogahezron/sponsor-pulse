import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmdirSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';
import { defineConfig, type Plugin } from 'vite';

type Browser = 'chrome' | 'firefox' | 'edge' | 'safari';
type ManifestObject = Record<string, unknown>;

const VALID_BROWSERS: Browser[] = ['chrome', 'firefox', 'edge', 'safari'];
const browser = (process.env.BROWSER ?? 'chrome') as Browser;

if (!VALID_BROWSERS.includes(browser)) {
  throw new Error(`Unknown BROWSER="${browser}". Valid: ${VALID_BROWSERS.join(', ')}`);
}

function mergeManifests(target: ManifestObject, source: ManifestObject): void {
  for (const key of Object.keys(source)) {
    const t = target[key];
    const s = source[key];
    if (Array.isArray(t) && Array.isArray(s)) {
      target[key] = [...t, ...s];
    } else if (t !== null && s !== null && typeof t === 'object' && typeof s === 'object') {
      mergeManifests(t as ManifestObject, s as ManifestObject);
    } else {
      target[key] = s;
    }
  }
}

function readJson(path: string): ManifestObject {
  const raw = readFileSync(path, 'utf-8');
  return JSON.parse(raw.replace(/"_comment":\s*"[^"]*",?\n?/g, '')) as ManifestObject;
}

function buildManifest(b: Browser): Plugin {
  return {
    name: 'build-manifest',
    closeBundle() {
      const root = resolve(__dirname);
      const out = resolve(root, `dist/${b}`);
      const base = readJson(join(root, 'public', 'manifest.json'));
      const extra = readJson(join(root, 'public', 'manifests', `${b}-extra.json`));
      mergeManifests(base, extra);
      mkdirSync(out, { recursive: true });
      writeFileSync(join(out, 'manifest.json'), JSON.stringify(base, null, 2));
    },
  };
}

function copyPolyfill(b: Browser): Plugin | null {
  if (b !== 'firefox' && b !== 'safari') return null;
  return {
    name: 'copy-polyfill',
    closeBundle() {
      const out = resolve(__dirname, `dist/${b}`);
      const src = resolve(__dirname, 'node_modules/webextension-polyfill/dist/browser-polyfill.js');
      mkdirSync(out, { recursive: true });
      copyFileSync(src, join(out, 'browser-polyfill.js'));
    },
  };
}

function flattenHtmlOutputs(b: Browser): Plugin {
  return {
    name: 'flatten-html-outputs',
    closeBundle() {
      const dist = resolve(__dirname, `dist/${b}`);

      function walk(dir: string): string[] {
        return readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
          const full = join(dir, e.name);
          return e.isDirectory() ? walk(full) : [full];
        });
      }

      for (const file of walk(dist)) {
        if (!file.endsWith('.html')) continue;
        const dest = join(dist, file.split('/').at(-1) ?? '');
        if (file !== dest && !existsSync(dest)) {
          copyFileSync(file, dest);
          unlinkSync(file);
        }
      }
    },
  };
}

function cleanDist(b: Browser): Plugin {
  return {
    name: 'clean-dist',
    enforce: 'post',
    closeBundle() {
      const dist = resolve(__dirname, `dist/${b}`);

      for (const dir of [join(dist, 'manifests'), join(dist, 'assets')]) {
        if (existsSync(dir)) rmSync(dir, { recursive: true, force: true });
      }

      function pruneEmpty(dir: string): void {
        for (const e of readdirSync(dir, { withFileTypes: true })) {
          if (e.isDirectory()) pruneEmpty(join(dir, e.name));
        }
        if (readdirSync(dir).length === 0 && dir !== dist) rmdirSync(dir);
      }
      pruneEmpty(dist);
    },
  };
}

const polyfillPlugin = copyPolyfill(browser);

export default defineConfig({
  plugins: [
    flattenHtmlOutputs(browser),
    buildManifest(browser),
    ...(polyfillPlugin ? [polyfillPlugin] : []),
    cleanDist(browser),
  ],
  build: {
    outDir: `dist/${browser}`,
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
  server: { open: false },
});
