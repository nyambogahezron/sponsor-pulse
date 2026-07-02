# SponsorPulse Architecture

SponsorPulse is a sophisticated multi-category video timeline filtering platform built using a modern monorepo architecture.

## Monorepo Structure

We use [Turborepo](https://turbo.build/) to manage our workspaces and [Bun](https://bun.sh/) as our package manager and runtime.

### `apps/extension`
The Chrome Extension frontend built with Vite, TypeScript, and Manifest V3. 
- **Popup/UI**: Written in Vanilla TS with custom CSS.
- **Background Service Worker**: Handles message passing, state management via `chrome.storage.local`, and acts as the bridge to the backend server.
- **Content Scripts**: Injected into YouTube to observe the DOM, inject the SponsorPulse action buttons, and manage the video player timeline.

### `apps/server`
The highly scalable backend built with [Hono](https://hono.dev/) and deployed on Bun.
- **AI Integration**: Communicates with the Gemini API to process YouTube transcripts and detect 8 distinct segment categories (e.g., `sponsor`, `merch`, `course_promo`).
- **Security**: Hardened with strict CORS policies, rate-limiting, and Zod validation for request/response payloads to prevent AI hallucination crashes.

### `apps/www`
The marketing and landing page for SponsorPulse, optimized for speed and SEO.

### `packages/shared`
A shared TypeScript library containing the core schema definitions (`SEGMENT_CATEGORIES`, `SegmentCategory`, `ServerSponsorSegment`, `AnalyzeRequest`, `AnalyzeResponse`). This ensures the frontend and backend are always in perfect sync — both `apps/extension` and `apps/server` import from `@sponsor-pulse/shared`.

```
packages/shared/src/index.ts  ← single source of truth for shared types
apps/extension/src/types/shared.ts  ← re-exports from @sponsor-pulse/shared
apps/server/src/ai/segments.ts  ← re-exports from @sponsor-pulse/shared
```

## Data Flow

1. **User Request**: The user clicks "Analyze" on a YouTube video via the injected content script.
2. **Client Hashing**: The extension hashes the YouTube Video ID using SHA-256 for privacy.
3. **Backend Processing**: The background worker sends the hashed ID to the Hono backend.
4. **AI Execution**: The backend fetches the transcript and prompts Gemini to identify the segments.
5. **Validation**: The backend uses Zod to sanitize the LLM response.
6. **Execution**: The extension receives the timestamps and the skipper logic fast-forwards the video accordingly.
