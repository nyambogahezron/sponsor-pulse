# SponsorPulse Extension

SponsorPulse is a Chrome extension that detects and automatically skips sponsored segments in YouTube videos.

## Directory Structure

The extension's source code is located in the `apps/extension` directory of this monorepo workspace.

```text
apps/extension/
├── public/                 # Static assets copied directly to dist (icons, manifest.json)
├── scripts/                # Utility scripts (e.g., generate-icons.mjs)
├── src/                    # Source code
│   ├── background/         # Background service worker logic
│   ├── content/            # Content scripts injected into web pages
│   ├── onboard/            # HTML/TS for the onboarding page
│   ├── popup/              # HTML/TS for the extension popup UI
│   ├── styles/             # Global and component CSS styles
│   └── types/              # TypeScript type definitions
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Development Workflow

We use [Turborepo](https://turbo.build/) to orchestrate tasks across the monorepo, and [Vite](https://vitejs.dev/) to build the extension.

### Running in Watch Mode

During development, you want the extension to automatically rebuild whenever you make changes to the source code.

Run the following command from the **root** of the workspace:

```bash
bun run dev --filter sponsor-pulse-extension
# Or simply run `bun run dev` to start dev mode for all apps
```

This will run `vite build --watch` under the hood. As you edit files in `apps/extension/src`, Vite will recompile them and output the results to `apps/extension/dist`.

### Loading the Extension in Chrome

To test the extension locally:

1. Open Google Chrome and navigate to `chrome://extensions`.
2. Enable **Developer mode** in the top right corner.
3. Click the **Load unpacked** button.
4. Select the `apps/extension/dist` directory in your local repository.

As you make changes and the `dist` folder is updated by Vite's watch mode, simply return to `chrome://extensions` and click the **reload** icon (↻) on the SponsorPulse extension card to apply the changes.

## Building for Production

To create an optimized production build of the extension:

Run the following command from the **root** of the workspace:

```bash
bun run build --filter sponsor-pulse-extension
# Or simply run `bun run build` to build all apps
```

This command runs `tsc` (for type checking) and `vite build`. The bundled, minified output will be placed in the `apps/extension/dist` directory, ready to be zipped and published to the Chrome Web Store.
