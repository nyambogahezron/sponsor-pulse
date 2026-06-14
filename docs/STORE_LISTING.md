# Chrome Web Store Listing & Compliance Data

## Store Listing Metadata

**Extension Title (Max 45 chars):**
`SponsorPulse AI: Skip Sponsors & Promos`

**Short Description (Max 132 chars):**
`Instantly skip sponsors, merch drops, and intros on YouTube. Save time with AI-powered, privacy-first video segment skipping.`

---

## Detailed Description (Max 16,000 chars)

**Take Back Your Time with SponsorPulse AI ⏱️**

Tired of endless sponsor reads, merchandise plugs, and long intros interrupting your flow? SponsorPulse AI is your ultimate, privacy-first YouTube companion. Powered by an advanced AI backend, it automatically detects and lets you skip filler content so you can get straight to the parts of the video that actually matter.

### ✨ Key Features
*   **🎨 Color-Coded Timeline Overlays:** See exactly where sponsors, intros, and promos are located directly on the YouTube video timeline.
*   **🖱️ Interactive Skip Toast:** A sleek, floating UI gives you full control. Choose to skip the current segment with a single click, or configure categories to auto-skip entirely.
*   **📊 Time Saved Gamification:** Track exactly how many hours and minutes of your life you've reclaimed by skipping filler content, all saved locally on your device.

### 🎯 Supported Skipping Categories
SponsorPulse AI intelligently categorizes video segments so you can customize exactly what you want to skip:
*   **🤝 Sponsors:** Paid promotions and integrated brand pitches.
*   **👕 Merch Drops:** Creator merchandise and product shoutouts.
*   **👋 Intros & Outros:** Lengthy channel introductions, hook previews, and end-screen begging.
*   **🏷️ Product Sales:** Affiliate links and first-party software/service pitches.
*   **🎟️ Event Promos:** Shoutouts for upcoming tours, streams, or events.

### 🛡️ Privacy-First by Design
We believe your viewing habits are yours alone. SponsorPulse AI is built from the ground up with a zero-tracking philosophy:
*   **No Personal Data Logged:** We do not track your browsing history, account details, or personal information.
*   **Cryptographic Anonymity:** When fetching segment data, your extension generates a secure, one-way SHA-256 hash of the video ID locally. Our servers only see the hash, never the actual video you are watching.
*   **Local Storage Only:** Your preferences, settings, and "time saved" statistics never leave your device. Everything is saved using secure local storage.

### 🚀 How to Use
1.  **Install & Pin:** Add SponsorPulse AI to Chrome and pin it to your toolbar.
2.  **Watch:** Open any YouTube video. If filler segments are detected, colored blocks will automatically appear on the video timeline.
3.  **Interact:** When a sponsored segment begins, a small floating toast will appear. Click "Skip" to jump past it!
4.  **Customize:** Click the extension icon to open your preferences. Toggle auto-skip for specific categories or check how much time you've saved.

Experience YouTube without the interruptions. Install SponsorPulse AI today!

---

## Privacy Practices & Permission Justifications
*(Copy and paste these exact justifications into your Developer Dashboard)*

**Permission: `scripting`**
> **Justification:** Required to dynamically inject the visual timeline overlays (colored segment blocks) and the interactive floating toast UI into the active YouTube video player. This allows users to seamlessly see and skip identified filler content without requiring a page reload.

**Permission: `storage`**
> **Justification:** Essential for locally persisting the user's customized skipping preferences (e.g., auto-skip vs. manual skip toggles for different categories) and saving gamification statistics (total time saved) entirely on their device.

**Host Permission: `*://*.youtube.com/*`**
> **Justification:** The extension must execute its content scripts exclusively on YouTube domains to read the current video ID and render the skipping UI within the video player. No personal browsing history is tracked, logged, or transmitted, and the script absolutely does not execute on any other web domains.

---

## Data Usage Compliance Statements
*(Use these single-sentence declarations for the User Data Privacy questionnaire)*

*   **Data Sale:** We do not sell user data to third parties under any circumstances.
*   **Credit/Lending:** User data is never used or transferred for purposes that are unrelated to the item's core functionality, such as credit scoring or lending.
*   **Core Functionality:** Data collection is strictly limited to non-identifiable, hashed video IDs required to fetch segment timestamps, directly supporting the core utility of skipping video filler.
