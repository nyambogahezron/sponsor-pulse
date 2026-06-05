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

## Quickstart

### Prerequisites
- [Bun](https://bun.sh/) (v1.x or later)

### Installation
Clone the repository and install dependencies from the root:
```bash
git clone https://github.com/nyambogahezron/sponsor-pulse.git
cd sponsor-pulse
bun install
```

### Running Locally
To start the development environment (backend server, static site, and extension watcher) all at once:
```bash
# Set up the server environment first
cp apps/server/.env.example apps/server/.env

# Run the dev servers and watch mode
bun run dev
```

### Loading the Extension
1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select the `apps/extension/dist/` directory.

## Developer Notes
- See the [Development Guide](docs/development.md) for full setup and architecture details.
- See [Extension Guide](docs/extension.md) for specific details on extension development.
- Run typechecking across the workspace: `bun run typecheck`
- Format and lint code: `bun run lint:apply`

Contributing
See [CONTRIBUTING.md](CONTRIBUTING.md) for contribution guidelines and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) for community standards.

License
This project is released under the terms of the LICENSE file in the repository.
