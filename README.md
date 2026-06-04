# SponsorPulse

**SponsorPulse** is a modern, high-performance Chrome Extension designed to detect and seamlessly skip sponsored segments in YouTube videos. Rather than relying purely on crowdsourced timestamps, SponsorPulse utilizes a robust AI pipeline to analyze video transcripts in real-time, ensuring zero interruptions to your viewing experience.

## ✨ Core Features

- **AI-Powered Detection:** Uses state-of-the-art LLMs (Gemini, Claude, OpenAI, DeepSeek) via a fast backend to process transcripts and identify sponsor segments automatically.
- **Native YouTube Integration:** Injects beautiful, state-driven UI directly into the YouTube player and action bar, matching YouTube's dark/light modes perfectly.
- **Smart Skipper Engine:** 
  - **Auto-Skip:** Automatically skips detected segments.
  - **Manual Overlay:** Displays a sleek, non-intrusive overlay in the video player asking if you want to skip.
  - **Keyboard Shortcuts:** Press \`S\` to skip a segment or \`D\` to dismiss the overlay and keep watching.
- **Privacy-First & Performant:** Analysis happens off the main thread (`requestIdleCallback`), ensuring video playback is never impacted.

## 🛠️ Tech Stack

SponsorPulse is built as a monorepo containing both the extension client and the API backend:

### Client (Chrome Extension)
- **Framework:** Vanilla TypeScript + Vite
- **Manifest:** Manifest V3
- **Styling:** Custom CSS with CSS Variables for dynamic theming
- **Pages:** Options, Stats Dashboard, Popup

### Backend (AI Server)
- **Runtime:** [Bun](https://bun.sh/)
- **Framework:** [Hono](https://hono.dev/)
- **AI Integration:** Unified adapter pattern supporting Gemini 3.5, GPT-4o, Claude 3.5, and DeepSeek.

---

## 🚀 Getting Started

### 1. Start the Backend Server

The AI backend needs to be running to analyze transcripts. 

\`\`\`bash
cd server
bun install

# Copy the environment file and add your preferred LLM API key
cp .env.example .env

# Start the server (runs on http://localhost:3000)
bun run dev
\`\`\`
*(For more detailed backend instructions, see the [Server README](./server/README.md)).*

### 2. Build the Extension

Open a new terminal window in the root directory:

\`\`\`bash
# Install dependencies
bun install

# Build the extension for production
bun run build
\`\`\`

This will generate a `dist/` folder containing the compiled extension.

### 3. Load into Chrome

1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** in the top right corner.
3. Click **Load unpacked** in the top left.
4. Select the `dist/` folder generated in the previous step.

Navigate to a YouTube video, and you should see the **SponsorPulse** button appear in the action bar below the video title and inside the player controls!

---

## 📂 Project Structure

\`\`\`text
sponsor-pulse/
├── src/                      # Chrome Extension Source Code
│   ├── content/              # Content scripts injected into YouTube
│   │   ├── index.ts          # Core orchestrator and UI injector
│   │   ├── aiDetector.ts     # Client-side transcript handling and chunking
│   │   └── sponsorSkipper.ts # Skip engine, UI overlays, and keybinds
│   ├── background/           # Service worker (Manifest V3)
│   ├── options/              # Options page UI
│   ├── popup/                # Extension popup UI
│   ├── stats/                # User statistics dashboard
│   ├── styles/               # CSS modules (content.css, popup.css, etc.)
│   └── types/                # Shared TS interfaces
├── server/                   # Hono + Bun Backend API
│   ├── src/                  # Server source code (Routes, AI Providers)
│   ├── .env.example          # Backend environment variables
│   └── README.md             # Backend specific documentation
├── public/                   # Static extension assets (icons, manifest.json)
├── vite.config.ts            # Vite bundler configuration
└── package.json              # Extension dependencies and build scripts
\`\`\`

---

## ⌨️ Keyboard Shortcuts

| Key | Action | Description |
| :--- | :--- | :--- |
| \`S\` | **Skip** | Skips the current active sponsor segment and jumps to the end of the ad. |
| \`D\` | **Dismiss** | Hides the manual skip overlay and prevents the current segment from triggering again. |

*Shortcuts only trigger when you are actively watching the video (they won't fire if you are typing in the search bar or comments).*

## 🤝 Contributing

Contributions are welcome! If you'd like to add new trigger keywords, improve the UI, or add a new LLM provider to the backend, feel free to open a PR. Ensure that all TypeScript compiles cleanly using `bun run build`.