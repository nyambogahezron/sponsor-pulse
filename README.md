<!-- Modernized README with logo and animated demo -->

<p align="center">
  <img src="docs/assets/logo.svg" alt="SponsorPulse logo" width="160" />
</p>

# SponsorPulse

SponsorPulse is a lightweight, privacy-first Chrome extension that detects and skips sponsored segments in YouTube videos using an AI-powered transcript analysis pipeline.

<p align="center">
  <img src="docs/assets/demo.svg" alt="SponsorPulse demo" width="780" />
</p>

Why SponsorPulse?
- Fast, AI-driven detection tuned for accuracy
- Minimal UI that integrates natively with YouTube
- Privacy-minded: analysis runs off the main thread and only uses transcript data

Highlights
- Auto-skip detected sponsor segments
- Manual overlay with keyboard shortcuts: `S` (skip), `D` (dismiss)
- Pluggable backend adapters for multiple LLM providers

Tech snapshot
- Client: TypeScript + Vite (Chrome Extension, Manifest V3)
- Server: Bun + Hono — small, fast AI backend

Quickstart
1. Start the backend

```bash
cd server
bun install
cp .env.example .env
bun run dev
```

2. Build the extension

```bash
bun install
bun run build
```

3. Load in Chrome (`chrome://extensions/` → Load unpacked → `dist/`)

Developer notes
- Run tests: `npm test` (or `npm run test` inside `server` as appropriate)
- Follow code style and keep PRs small and focused

Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community standards.

License
This project is released under the terms of the LICENSE file in the repository.
