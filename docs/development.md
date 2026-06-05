# Development Guide

Welcome to the SponsorPulse development guide! This document covers how to set up your environment, understand the monorepo architecture, and run the applications locally.

## Prerequisites

- [Bun](https://bun.sh/) (v1.x or later) is used as the primary package manager and runtime.
- Node.js (v20+ recommended) is required by some tooling, but Bun takes care of most tasks.
- A Chromium-based browser (Chrome, Edge, Brave) for testing the extension.

## Monorepo Architecture

We use [Turborepo](https://turbo.build/) to orchestrate our tasks across multiple apps in a single repository. The repository is structured into distinct applications:

- `apps/extension`: The Chrome extension (Manifest V3) built with Vite and TypeScript.
- `apps/server`: The Hono + Bun backend service that processes YouTube transcripts via AI providers.
- `apps/www`: The landing page and static site for the project.

## Installation

Clone the repository and install all dependencies from the root using Bun:

```bash
git clone https://github.com/nyambogahezron/sponsor-pulse.git
cd sponsor-pulse
bun install
```

## Running the Applications Locally

Turborepo simplifies running the applications. From the root directory, you can run all applications simultaneously or individually.

### Start All Apps in Development Mode

```bash
bun run dev
```
This command starts the Vite development server for the static site (`www`), starts the backend API (`server`) with hot-reloading, and watches for file changes to automatically rebuild the Chrome `extension`.

### Building for Production

To build all applications for production:

```bash
bun run build
```

This will run the respective build scripts for `extension` and `www`, placing the bundled output in their respective `dist/` folders. 

### Running Individual Apps

If you only want to work on a specific application, use the `--filter` flag:

```bash
# Start only the server
bun run dev --filter sponsor-pulse-server

# Build only the extension
bun run build --filter sponsor-pulse-extension

# Preview the landing page
bun run preview --filter www
```

## Setting Up the Backend Server

The backend requires environment variables to connect to AI providers (like Gemini or OpenAI).

1. Navigate to the server directory: `cd apps/server`
2. Copy the example `.env` file: `cp .env.example .env`
3. Add your API keys to the `.env` file.

## Code Quality

We enforce code quality using Biome and TypeScript. 

```bash
# Run typechecking across the workspace
bun run typecheck

# Lint all files
bun run lint

# Automatically fix lint and format issues
bun run lint:apply
```

Husky is configured to automatically run these checks on `git commit`.
