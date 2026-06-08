# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0-beta] - 2026-06-08

### Added
- **Multi-Category Filtering**: Introduced support for 8 distinct AI-driven segment categories (`sponsor`, `shoutout`, `course_promo`, `merch`, `product_sale`, `event_promo`, `intro_creator`, `intro_external`).
- **Gamification Schema**: Implemented robust tracking for seconds saved and total segments skipped per category in `chrome.storage.local`.
- **Privacy Hashing**: YouTube Video IDs are now securely hashed using `crypto.subtle.digest('SHA-256')` before being transmitted to the backend.
- **Agent Instructions**: Added `AGENTS.md` and `GEMINI.md` to formally register AI capabilities and code generation guidelines.
- **Shared Types**: Created `@sponsor-pulse/shared` package to guarantee type synchronization between the Hono backend and Vite frontend.
- **Custom Issue Templates**: Added informative templates for Bug Reports, Feature Requests, and a specialized `ai_feedback.md` template for reporting hallucinatory/inaccurate transcript processing.

### Changed
- **Extension Defaults**: Refactored the `chrome.runtime.onInstalled` background hook to properly hydrate the default user preferences upon installation.
- **Security Policy**: Updated `SECURITY.md` with guidelines on how to privately disclose vulnerabilities to the team.
- **Backend Validation**: Upgraded the `analyze` route to strict Zod validation that drops any invalid/hallucinatory AI categories from the Gemini response.
- **Linter Tuning**: Resolved residual TypeScript issues and `any` types across the monorepo for strict typing.

### Fixed
- Fixed an architectural drift where `SegmentCategory` declarations were duplicated and desynced between client and server.
- Fixed a bug where `chrome.storage.local` reads were returning `undefined` prior to the user interacting with the options panel.
